package at.htlleonding.types.dtos;

import java.util.List;

public record BulkOrderRequestDTO(
    List<OrderItemDTO> items
) {
    public record OrderItemDTO(
        Long productId,
        int quantity
    ) {}
}
