package at.htlleonding.types.dtos;

import java.time.LocalDateTime;

/**
 * Unified item for completed orders: either a product order or a ticket upgrade.
 */
public record CompletedOrderItemDTO(
        String type,
        Long id,
        String title,
        int quantity,
        LocalDateTime orderedAt,
        double totalPrice
) {
    public static final String TYPE_PRODUCT = "product";
    public static final String TYPE_UPGRADE = "upgrade";
}
