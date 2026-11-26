package at.htlleonding.types.dtos.admin;

import java.util.UUID;

public record AddTicketAfterBookingDTO(
        UUID OrderId,
        int externalTicketCount,
        int internalTicketCount
) {
}
