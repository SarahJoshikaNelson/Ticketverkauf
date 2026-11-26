package at.htlleonding.WebSockets;

import at.htlleonding.TimeOutManager;
import at.htlleonding.WaitingManager;
import at.htlleonding.conversion.CookieReader;
import io.quarkus.websockets.next.*;
import jakarta.enterprise.context.SessionScoped;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.Serializable;

@WebSocket(path = "/api/active")
@SessionScoped
@NoArgsConstructor
public class ActiveReservationWebSocket implements Serializable {
    private transient OpenConnections openConnections;
    private transient WaitingManager waitingManager;
    private transient CookieReader cookieReader;
    private transient TimeOutManager timeOutManager;

    private static final Logger log = LoggerFactory.getLogger(ActiveReservationWebSocket.class);

    private String sessionId;

    public ActiveReservationWebSocket(OpenConnections openConnections, WaitingManager waitingManager, CookieReader cookieReader, TimeOutManager timeOutManager) {
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
        //log.info("ActiveReservation WebSocket handshake - All headers:");
        handshakeRequest.headers().forEach((key, values) ->
                //log.info("  {}: {}", key, String.join(", ", values))
                {}
        );

        var cookies = handshakeRequest.headers().get("cookie");

        String cookie = null;
        if (cookies != null && !cookies.isEmpty()) {
            //log.info("Cookie header received: {}", cookies.getFirst());
            cookie = cookieReader.getCookie(cookies.getFirst().split(";"), "__session");
            //log.info("Extracted __session cookie: {}", cookie);
        } else {
            //log.info("No cookie header found in request");
            return;
        }

        sessionId = cookie;

        if (timeOutManager.soonDeletedActiveReservations.stream().anyMatch(session -> session.sessionId().equals(sessionId))) {
            //log.info("Session cookie found in soonDeletedActiveReservations, clearing timeout");
            timeOutManager.clearTimeout(timeOutManager.soonDeletedActiveReservations.stream().filter(session -> session.sessionId().equals(sessionId)).findFirst().get().future());
            timeOutManager.soonDeletedActiveReservations.remove(timeOutManager.soonDeletedActiveReservations.stream().filter(session -> session.sessionId().equals(sessionId)).findFirst().get());
        }
    }

    @OnClose
    public void onClose() {
        if (!waitingManager.isInActiveReservations(sessionId)) {
            //log.info("Session ID: {} is not in active reservations, returning", sessionId);
            return;
        }

        //log.info("Session ID: {} is in active reservations, adding to soonDeletedActiveReservations", sessionId);

        timeOutManager.soonDeletedActiveReservations.add(new TimeOutManager.SoonDeletedSession(sessionId, timeOutManager.setTimeout(() -> {
            waitingManager.removeActiveReservation(sessionId);
            timeOutManager.removeSoonDeletedActiveReservation(sessionId);
        }, 15000)));
    }

    @OnTextMessage
    public void onMessage(String message) {
    }
}
