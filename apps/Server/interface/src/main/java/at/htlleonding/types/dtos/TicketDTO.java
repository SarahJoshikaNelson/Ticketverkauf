package at.htlleonding.types.dtos;

import at.htlleonding.enums.TicketType;

import java.util.UUID;

public record TicketDTO(
        TicketType type,
        UUID id,
        double price,
        boolean isPhysical
) {
    public TicketDTO(TicketType type, UUID id, boolean isPhysical) {
        this(type, id, type.getPrice(), isPhysical);
    }

    public double getPrice(TicketDTO dto) {
        return dto.price();
    }

    public double getTotalPrice(TicketDTO dto, double additionalChargeForPhysicalTickets) {
        return getPrice(dto) + (dto.isPhysical() ? additionalChargeForPhysicalTickets : 0.0);
    }
}
