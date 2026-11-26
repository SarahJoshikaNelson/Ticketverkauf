package at.htlleonding.types.dtos;

import at.htlleonding.enums.TicketType;

public record TicketBookingEndpointDto(
        String id,
        double price,
        TicketType type,
        boolean isPhysical
) {
}
