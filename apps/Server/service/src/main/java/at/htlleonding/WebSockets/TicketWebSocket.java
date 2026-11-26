package at.htlleonding.WebSockets;

import at.htlleonding.TicketManager;
import at.htlleonding.TimeOutManager;
import at.htlleonding.conversion.CookieReader;
import at.htlleonding.types.dtos.TicketCountDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@WebSocket(path = "/api/ticket")
@ApplicationScoped
@NoArgsConstructor
public class TicketWebSocket {
    private TicketManager ticketManager;
    private ObjectMapper objectMapper;
    private TimeOutManager timeOutManager;
    private CookieReader cookieReader;

    private static final Logger log = LoggerFactory.getLogger(TicketWebSocket.class);
    private static final Map<String, ConnectionData> connections = new ConcurrentHashMap<>();

    private record ConnectionData(WebSocketConnection connection, int selectedTickets, String sessionId) {}

    @Inject
    public TicketWebSocket(TicketManager ticketManager, ObjectMapper objectMapper, TimeOutManager timeOutManager, CookieReader cookieReader) {
        this.ticketManager = ticketManager;
        this.objectMapper = objectMapper;
        this.timeOutManager = timeOutManager;
        this.cookieReader = cookieReader;
    }

    private int getTotalSelectedTickets() {
        return connections.values().stream().mapToInt(ConnectionData::selectedTickets).sum();
    }

    @OnOpen
    public TicketCountDTO onOpen(WebSocketConnection connection, HandshakeRequest handshakeRequest) {
        log.info("TicketWebSocket - Opening connection: {}", connection.id());
        
        // Extract session cookie
        var cookies = handshakeRequest.headers().get("cookie");
        String extractedSessionId = null;
        
        if (cookies != null && !cookies.isEmpty()) {
            extractedSessionId = cookieReader.getCookie(cookies.get(0).split(";"), "__session");
            log.info("TicketWebSocket - Extracted session cookie: {}", extractedSessionId);
        }
        
        if (extractedSessionId == null || extractedSessionId.isEmpty()) {
            extractedSessionId = "ticket_session_" + System.currentTimeMillis() + "_" + UUID.randomUUID();
            log.info("TicketWebSocket - Generated new session ID: {}", extractedSessionId);
        }
        
        // Make final for lambda
        final String sessionId = extractedSessionId;
        
        // Check if this session was recently disconnected
        int restoredTickets = 0;
        var existingSession = timeOutManager.soonDeletedTicketSessions.stream()
                .filter(session -> session.connectionId().equals(sessionId))
                .findFirst();
        
        if (existingSession.isPresent()) {
            log.info("TicketWebSocket - Found existing session, restoring {} tickets", existingSession.get().selectedTickets());
            restoredTickets = existingSession.get().selectedTickets();
            
            // Cancel the timeout and remove from soon deleted list
            timeOutManager.clearTimeout(existingSession.get().future());
            timeOutManager.removeSoonDeletedTicketSession(sessionId);
        }
        
        connections.put(connection.id(), new ConnectionData(connection, restoredTickets, sessionId));
        
        try {
            return new TicketCountDTO(ticketManager.getBoughtTickets() + getTotalSelectedTickets());
        } catch (Exception e) {
            return new TicketCountDTO(1);
        }
    }

    @OnClose
    public void onClose(WebSocketConnection connection) {
        log.info("TicketWebSocket - Closing connection: {}", connection.id());
        
        ConnectionData connectionData = connections.get(connection.id());
        if (connectionData != null) {
            String sessionId = connectionData.sessionId();
            int selectedTickets = connectionData.selectedTickets();

            log.info("TicketWebSocket - Session {} has {} selected tickets, adding 15s timeout", sessionId, selectedTickets);
            
            // Remove first to clean up any existing timeout for this session
            timeOutManager.removeSoonDeletedTicketSession(sessionId);
            
            // Add to soon deleted list with 15 second timeout
            timeOutManager.soonDeletedTicketSessions.add(
                new TimeOutManager.SoonDeletedTicketSession(
                    sessionId,
                    selectedTickets,
                    timeOutManager.setTimeout(() -> {
                        log.info("TicketWebSocket - Timeout expired for session {}, removing selected tickets", sessionId);
                        timeOutManager.removeSoonDeletedTicketSession(sessionId);
                        
                        // Notify all remaining connections about the ticket count change
                        try {
                            TicketCountDTO dto = new TicketCountDTO(ticketManager.getBoughtTickets() + getTotalSelectedTickets());
                            String json = objectMapper.writeValueAsString(dto);
                            // Use async sendText instead of blocking sendTextAndAwait to prevent freezing
                            connections.values().forEach(data -> {
                                try {
                                    data.connection().sendText(json);
                                } catch (Exception e) {
                                    log.error("Failed to send message to connection {}: {}", data.connection().id(), e.getMessage());
                                }
                            });
                        } catch (Exception e) {
                            for (StackTraceElement ste : e.getStackTrace()) {
                                log.error("{}", ste);
                            }
                        }
                    }, 15000)
                )
            );
            
            // Remove from active connections
            connections.remove(connection.id());
        }
        
        try {
            TicketCountDTO dto = new TicketCountDTO(ticketManager.getBoughtTickets() + getTotalSelectedTickets());
            String json = objectMapper.writeValueAsString(dto);
            // Use async sendText instead of blocking sendTextAndAwait to prevent freezing
            connections.values().forEach(data -> {
                try {
                    data.connection().sendText(json);
                } catch (Exception e) {
                    log.error("Failed to send message to connection {}: {}", data.connection().id(), e.getMessage());
                }
            });
        } catch (Exception e) {
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
        }
    }

    @OnTextMessage
    public void onMessage(String message, WebSocketConnection connection) {
        try {
            int userReservedTickets = Integer.parseInt(message);
            ConnectionData existingData = connections.get(connection.id());
            String sessionId = existingData != null ? existingData.sessionId() : "unknown";

            log.info("TicketWebSocket - Session {} updated tickets to: {}", sessionId, userReservedTickets);
            connections.put(connection.id(), new ConnectionData(connection, userReservedTickets, sessionId));
        } catch (NumberFormatException e) {
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
            return;
        }

        try {
            TicketCountDTO dto = new TicketCountDTO(ticketManager.getBoughtTickets() + getTotalSelectedTickets());
            String json = objectMapper.writeValueAsString(dto);
            connections.values().forEach(data -> {
                try {
                    data.connection().sendTextAndAwait(json);
                } catch (Exception e) {
                    log.error("Failed to send message to connection {}: {}", data.connection().id(), e.getMessage());
                }
            });
        } catch (Exception e) {
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
        }
    }
}
