package at.htlleonding.types.dtos.admin;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.types.dtos.SeatDTO;
import at.htlleonding.types.dtos.TicketDTO;

import java.time.LocalDateTime;
import java.util.List;

public record OrderDTO(
        OrderStatus status,
        LocalDateTime orderDate,
        List<TicketDTO> tickets,
        List<SeatDTO> seats,
        double additionalChargeForPhysicalTickets
) {

    // Template compatibility - seats can be accessed as table items
    public List<SeatDTO> tableItems() {
        return seats;
    }

    // Calculate total price for all tickets and seats including physical ticket charges
    public double calcTotal() {
        double total = 0.0;
        if (tickets != null) {
            for (TicketDTO ticket : tickets) {
                total += ticket.price();
                if (ticket.isPhysical()) {
                    total += additionalChargeForPhysicalTickets;
                }
            }
        }
        if (seats != null) {
            for (SeatDTO seat : seats) {
                total += seat.price();
            }
        }
        return total;
    }
}
