package at.htlleonding.types.dtos;

import at.htlleonding.enums.OrderStatus;

import java.util.List;

public record BulkMailRequestDTO(
    String subject,
    String content,
    List<OrderStatus> targetStatuses,  // null or empty = all orders
    boolean includeBills  // Only for PAID orders
) {
}

