package at.htlleonding.types.dtos;

import java.util.List;

public record OrderContentDTO(
        String status,
        String orderDate,
        List<TicketDTO> tickets,
        List<SeatDTO> seats
) {
}
