package at.htlleonding.types.dtos;

import java.time.LocalDateTime;

public record ProductOrderDTO(
        Long id,
        Long productId,
        String productTitle,
        String username,
        int quantity,
        LocalDateTime orderedAt,
        double totalPrice
) {}
