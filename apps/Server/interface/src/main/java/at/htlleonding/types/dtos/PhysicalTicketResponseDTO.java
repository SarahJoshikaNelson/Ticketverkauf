package at.htlleonding.types.dtos;

import java.util.UUID;

public record PhysicalTicketResponseDTO(
        UUID ticketId,
        String ownerName,
        UUID orderId
) {
}
