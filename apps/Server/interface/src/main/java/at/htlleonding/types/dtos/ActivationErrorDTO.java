package at.htlleonding.types.dtos;

import java.time.LocalDateTime;
import java.util.UUID;

public record ActivationErrorDTO(
        String message,
        LocalDateTime activatedAt,
        String customerName,
        UUID orderId,
        LocalDateTime orderDate
) {
    public ActivationErrorDTO(String message) {
        this(message, null, null, null, null);
    }
    
    public ActivationErrorDTO(String message, LocalDateTime activatedAt) {
        this(message, activatedAt, null, null, null);
    }
}
