package at.htlleonding.WebSockets;

import at.htlleonding.SeatManager;
import at.htlleonding.SelectedSeatManager;
import at.htlleonding.types.Seat;
import io.quarkus.websockets.next.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.*;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.StringReader;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@WebSocket(path = "/api/tables/")
@ApplicationScoped
@NoArgsConstructor
public class TableWebSocket {
    private SelectedSeatManager selectedSeatManager;
    private SeatManager seatManager;

    private final Map<String, WebSocketConnection> connections = new HashMap<>();

    @Inject
    public TableWebSocket(SeatManager seatManager, SelectedSeatManager selectedSeatManager) {
        this.seatManager = seatManager;
        this.selectedSeatManager = selectedSeatManager;
    }

    @OnOpen
    public void onOpen(WebSocketConnection connection) {
        try {
            // Store the connection
            connections.put(connection.id(), connection);
            log.info("New WebSocket connection established: {}", connection.id());
            
            // Send only current seat selections (not full room structure)
            sendCurrentSelections(connection);
            log.info("Successfully sent current selections to client: {}", connection.id());
        } catch (Exception e) {
            log.error("Error sending initial state onOpen: {}", e.getMessage(), e);
        }
    }

    private void sendCurrentSelections(WebSocketConnection connection) {
        try {
            Set<String> currentSelections = getCurrentSelections();
            
            JsonObject message = Json.createObjectBuilder()
                    .add("type", "initialSelections")
                    .add("selectedSeatIds", Json.createArrayBuilder(currentSelections))
                    .build();
            
            connection.sendTextAndAwait(message.toString());
        } catch (Exception e) {
            log.error("Error sending current selections: {}", e.getMessage(), e);
        }
    }

    private Set<String> getCurrentSelections() {
        return selectedSeatManager.getAllSelectedSeats().stream()
                .map(seat -> seat.getId().toString())
                .collect(Collectors.toSet());
    }

    @OnTextMessage
    public void onMessage(String message, WebSocketConnection connection) {
        try {
            log.info("Received WebSocket message from client {}: {}", connection.id(), message);
            
            // Parse JSON message
            JsonReader reader = Json.createReader(new StringReader(message));
            JsonObject messageJson = reader.readObject();
            reader.close();
            
            String messageType = messageJson.getString("type", "unknown");
            
            switch (messageType) {
                case "seatSelection" -> {
                    JsonArray seatIds = messageJson.getJsonArray("seatIds");
                    List<UUID> selectedSeatIds = seatIds.stream()
                            .map(JsonValue::toString)
                            .map(id -> id.replace("\"", ""))
                            .map(UUID::fromString)
                            .collect(Collectors.toCollection(ArrayList::new));
                    
                    handleSeatSelection(connection, selectedSeatIds);
                }
                case "seatUnselection" -> {
                    JsonArray seatIds = messageJson.getJsonArray("seatIds");
                    List<UUID> unselectedSeatIds = seatIds.stream()
                            .map(JsonValue::toString)
                            .map(id -> id.replace("\"", ""))
                            .map(UUID::fromString)
                            .collect(Collectors.toCollection(ArrayList::new));
                    
                    handleSeatUnselection(connection, unselectedSeatIds);
                }
                default -> log.warn("Unknown message type: {}", messageType);
            }
            
        } catch (Exception e) {
            log.error("Error processing message: {}", e.getMessage(), e);
        }
    }

    private void handleSeatSelection(WebSocketConnection connection, List<UUID> selectedSeatIds) {
        log.info("Processing seat selection for connection {}: {}", connection.id(), selectedSeatIds);
        
        // Get seats from database
        List<Seat> seats = selectedSeatIds.stream()
                .map(seatId -> {
                    Seat seat = seatManager.findSeatById(seatId);
                    if (seat == null) {
                        log.warn("Seat {} not found in database", seatId);
                    }
                    return seat;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));
        
        if (seats.isEmpty()) {
            log.warn("No valid seats found for selection");
            return;
        }
        
        // Select the seats
        selectedSeatManager.selectSeats(connection.id(), seats);
        
        // Broadcast updated selections
        broadcastAllSelections();
    }
    
    private void handleSeatUnselection(WebSocketConnection connection, List<UUID> unselectedSeatIds) {
        log.info("Processing seat unselection for connection {}: {}", connection.id(), unselectedSeatIds);
        
        // Get seats from database
        List<Seat> seats = unselectedSeatIds.stream()
                .map(seatId -> {
                    Seat seat = seatManager.findSeatById(seatId);
                    if (seat == null) {
                        log.warn("Seat {} not found in database for unselection", seatId);
                    }
                    return seat;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));
        
        if (seats.isEmpty()) {
            log.warn("No valid seats found for unselection");
            return;
        }
        
        log.info("Unselecting {} seats for connection {}", seats.size(), connection.id());
        
        // Unselect the seats
        selectedSeatManager.unselectSeats(connection.id(), seats);
        
        // Broadcast updated selections
        broadcastAllSelections();
    }
    
    private void broadcastAllSelections() {
        Set<String> allSelections = getCurrentSelections();
        log.info("Broadcasting seat updates to {} connections: {}", connections.size(), allSelections);
        
        JsonObject message = Json.createObjectBuilder()
                .add("type", "seatUpdate")
                .add("selectedSeatIds", Json.createArrayBuilder(allSelections))
                .build();
        
        String payload = message.toString();
        
        connections.forEach((id, connection) -> {
            try {
                connection.sendTextAndAwait(payload);
            } catch (Exception e) {
                log.error("Error broadcasting to connection: {}", id, e);
            }
        });
    }

    
    @OnClose
    public void onClose(WebSocketConnection connection) {
        String connectionId = connection.id();
        connections.remove(connectionId);
        
        // Free up all seats selected by this user
        selectedSeatManager.unselectSeats(connectionId);
        
        // Broadcast updated selections to all remaining clients
        broadcastAllSelections();
        
        log.info("User {} disconnected, seats freed and broadcasted to {} remaining connections", 
                connectionId, connections.size());
    }
}
