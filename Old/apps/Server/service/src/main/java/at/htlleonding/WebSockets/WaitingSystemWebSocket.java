package at.htlleonding.WebSockets;

import at.htlleonding.TimeOutManager;
import at.htlleonding.WaitingListObserver;
import at.htlleonding.WaitingManager;
import at.htlleonding.conversion.CookieReader;
import at.htlleonding.conversion.JsonConverter;
import at.htlleonding.types.dtos.ActiveReservationEntry;
import at.htlleonding.types.dtos.WaitingListEntry;
import at.htlleonding.types.dtos.WaitingListSummary;
import io.quarkus.websockets.next.*;
import jakarta.enterprise.context.SessionScoped;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;

@WebSocket(path = "/api/v2/waiting")
@SessionScoped
@NoArgsConstructor
public class WaitingSystemWebSocket implements Serializable {
    private transient JsonConverter converter;
    private transient OpenConnections openConnections;
    private transient WaitingManager waitingManager;
    private transient CookieReader cookieReader;
    private transient TimeOutManager timeOutManager;

    private String sessionId;

    private static final Logger log = LoggerFactory.getLogger(WaitingSystemWebSocket.class);

    @Inject
    public WaitingSystemWebSocket(JsonConverter converter, OpenConnections openConnections, WaitingManager waitingManager, CookieReader cookieReader, TimeOutManager timeOutManager) {
        this.converter = converter;
        this.openConnections = openConnections;
        this.waitingManager = waitingManager;
        this.cookieReader = cookieReader;
        this.timeOutManager = timeOutManager;
    }

    public void sendToAll(String message) {
        openConnections.forEach(connection -> connection.sendTextAndAwait(message));
    }

    @OnOpen
    public void onOpen(HandshakeRequest handshakeRequest) {
        log.info("WebSocket handshake - All headers:");
        handshakeRequest.headers().forEach((key, values) ->
                log.info("  {}: {}", key, String.join(", ", values))
        );

        var cookies = handshakeRequest.headers().get("cookie");

        String cookie = null;
        if (cookies != null && !cookies.isEmpty()) {
            log.info("Cookie header received: {}", cookies.getFirst());
            cookie = cookieReader.getCookie(cookies.getFirst().split(";"), "__session");
            log.info("Extracted __session cookie: {}", cookie);
        } else {
            log.info("No cookie header found in request");
        }

        if (cookie == null || cookie.isEmpty()) {
            cookie = "session_" + System.currentTimeMillis() + UUID.randomUUID();
            log.info("Generated temporary session: {}", cookie);
        }

        String sessionCookie = cookie;

        timeOutManager.soonDeletedSessions.forEach(session -> log.info("Session: {}", session.sessionId()));

        if (timeOutManager.soonDeletedSessions.stream().anyMatch(session -> session.sessionId().equals(sessionCookie))) {
            log.info("Session cookie found in soonDeletedSessions, clearing timeout");
            timeOutManager.clearTimeout(timeOutManager.soonDeletedSessions.stream().filter(session -> session.sessionId().equals(sessionCookie)).findFirst().get().future());
            timeOutManager.soonDeletedSessions.remove(timeOutManager.soonDeletedSessions.stream().filter(session -> session.sessionId().equals(sessionCookie)).findFirst().get());
        } else {
            sessionId = waitingManager.addWaiting(sessionCookie);
        }

        if (waitingManager.inFrontOfSessionHolder(sessionId) == -1 && !waitingManager.isInWaitingList(sessionCookie)) {
            sessionId = waitingManager.addWaiting(sessionCookie);
            log.info("Session added to waiting list: {}", sessionId);
        }

        sessionId = sessionCookie;

        WaitingListSummary waitingListSummary = new WaitingListSummary(waitingManager.getCurrentlyWaiting(), waitingManager.inFrontOfSessionHolder(sessionId), sessionId, true);
        JsonObject json = converter.toJsonWaitingListSummary(waitingListSummary);

        waitingManager.addObserver(waitingListObserver);

        openConnections.forEach(connection -> connection.sendTextAndAwait(json.toString()));
    }

    @OnClose
    public void onClose() {
        log.info("Session closed, adding to soonDeletedSessions: {}", sessionId);
        timeOutManager.removeSoonDeletedSession(sessionId);
        timeOutManager.soonDeletedSessions.add(new TimeOutManager.SoonDeletedSession(sessionId, timeOutManager.setTimeout(() -> {
            log.info("Removing session from waiting list: {}", sessionId);
            waitingManager.removeWaiting(sessionId);
            timeOutManager.removeSoonDeletedSession(sessionId);
        }, 15000)));
    }

    @OnTextMessage
    public void onMessage(String message) {
        int userReservedTickets = Integer.parseInt(message);

        timeOutManager.removeSoonDeletedSession(sessionId);
        waitingManager.removeWaiting(sessionId);

        String waitingId = waitingManager.addWaiting(sessionId);
        sessionId = waitingId;

        for (int i = 0; i < userReservedTickets; i++) {
            waitingManager.addWaiting(sessionId);
        }

        WaitingListSummary waitingListSummary = new WaitingListSummary(waitingManager.getCurrentlyWaiting(), waitingManager.inFrontOfSessionHolder(sessionId), sessionId, false);
        JsonObject json = converter.toJsonWaitingListSummary(waitingListSummary);
        openConnections.forEach(connection -> connection.sendTextAndAwait(json.toString()));
    }

    WaitingListObserver waitingListObserver = new WaitingListObserver() {
        @Override
        public void onWaitingListChanged(List<WaitingListEntry> waitingList) {
            WaitingListSummary waitingListSummary = new WaitingListSummary(waitingManager.getCurrentlyWaiting(), waitingManager.inFrontOfSessionHolder(sessionId), sessionId, false);
            JsonObject json = converter.toJsonWaitingListSummary(waitingListSummary);
            openConnections.forEach(connection -> connection.sendTextAndAwait(json.toString()));
        }

        @Override
        public void onActiveReservationsChanged(List<ActiveReservationEntry> activeReservations) {
            activeReservations.forEach(entry -> log.info("Entry: {}", entry.sessionId()));
            WaitingListSummary waitingListSummary = new WaitingListSummary(waitingManager.getCurrentlyWaiting(), waitingManager.inFrontOfSessionHolder(sessionId), sessionId, false);
            JsonObject json = converter.toJsonWaitingListSummary(waitingListSummary);
            openConnections.forEach(connection -> connection.sendTextAndAwait(json.toString()));
        }
    };
}
