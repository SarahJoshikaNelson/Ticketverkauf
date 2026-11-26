package at.htlleonding.types.dtos;

import at.htlleonding.types.Seat;
import at.htlleonding.types.Ticket;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public record ReservationDTO(
        CustomerDTO customer,
        List<Ticket> tickets,
        double additionalChargeForPhysicalTickets,
        List<Seat> seats,
        String token
) {
    public ReservationDTO {
        if (seats == null) seats = List.of();
        if (tickets == null) tickets = List.of();
    }

    public double calcTable() {
        return seats.stream().map(Seat::calcPrice).reduce(0.0, Double::sum);
    }

    public double calcTotal() {
        return tickets.stream().map(t -> t.calcTotalPrice(additionalChargeForPhysicalTickets)).reduce(0.0, Double::sum)
                + calcTable();
    }

    public String calcTotalFormatted() {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("de-AT"));
        return formatter.format(calcTotal());
    }

    // Template compatibility - seats can be accessed as table items
    public List<Seat> tableItems() {
        return seats;
    }
}
