package at.htlleonding.WebSockets;

import at.htlleonding.ProductManager;
import at.htlleonding.types.dtos.ProductDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@WebSocket(path = "/api/v2/shop/stock")
@ApplicationScoped
public class ShopStockWebSocket {

    private static final Logger log = LoggerFactory.getLogger(ShopStockWebSocket.class);
    private final ConcurrentHashMap<String, WebSocketConnection> connections = new ConcurrentHashMap<>();

    @Inject
    ProductManager productManager;

    @Inject
    ObjectMapper objectMapper;

    @OnOpen
    public void onOpen(WebSocketConnection connection) {
        connections.put(connection.id(), connection);
        log.debug("Shop stock WebSocket connection opened: {}", connection.id());
        sendProducts(connection, productManager.getAllProducts());
    }

    @OnClose
    public void onClose(WebSocketConnection connection) {
        connections.remove(connection.id());
        log.debug("Shop stock WebSocket connection closed: {}", connection.id());
    }

    public void broadcast(List<ProductDTO> products) {
        String json;
        try {
            json = objectMapper.writeValueAsString(products);
        } catch (Exception e) {
            log.error("Failed to serialize products for WebSocket broadcast", e);
            return;
        }
        final String payload = json;
        connections.values().forEach(conn -> {
            try {
                conn.sendText(payload);
            } catch (Exception e) {
                log.warn("Failed to send to connection {}: {}", conn.id(), e.getMessage());
            }
        });
    }

    private void sendProducts(WebSocketConnection connection, List<ProductDTO> products) {
        try {
            String json = objectMapper.writeValueAsString(products);
            connection.sendText(json);
        } catch (Exception e) {
            log.warn("Failed to send initial products to connection {}: {}", connection.id(), e.getMessage());
        }
    }
}
