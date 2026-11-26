package at.htlleonding.types.dtos.admin;

import java.util.UUID;

public record UpdateOrderDto(
        UUID orderId,
        String firstName,
        String lastName,
        int ticketCount
) {
}
