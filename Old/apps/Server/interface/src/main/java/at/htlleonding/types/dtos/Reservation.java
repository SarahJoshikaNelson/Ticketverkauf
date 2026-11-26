package at.htlleonding.types.dtos;

import at.htlleonding.enums.TicketType;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record Reservation(
        CustomerDTO customer,
        List<TicketType> tickets,
        List<Seat> seats,
        String token
) {
    public Reservation {
        if (seats == null) {
            seats = List.of();
        }
        if (tickets == null) {
            tickets = List.of();
        }
    }

    public double calcTable() {
        return seats.stream().map(Seat::calcPrice).reduce(0.0, Double::sum);
    }

    public double calcTotal() {
        return tickets.stream().map(TicketType::getPrice).reduce(0.0, Double::sum) + calcTable();
    }

    // Template compatibility - seats can be accessed as table items
    public List<Seat> tableItems() {
        return seats;
    }

    // Group seats by table for display in emails
    public List<TableGroup> groupedTables() {
        Map<Table, List<Seat>> grouped = seats.stream()
                .filter(seat -> seat.getTable() != null)
                .collect(Collectors.groupingBy(Seat::getTable));

        return grouped.entrySet().stream()
                .map(entry -> new TableGroup(
                        entry.getKey(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // Group tickets by type for display in emails
    public List<TicketGroup> groupedTickets() {
        Map<TicketType, List<TicketType>> grouped = tickets.stream()
                .collect(Collectors.groupingBy(ticket -> ticket));

        return grouped.entrySet().stream()
                .map(entry -> new TicketGroup(
                        entry.getKey(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public record TableGroup(Table table, List<Seat> seats) {
        public String getTableName() {
            return table.getName();
        }

        public String getRoomName() {
            return table.getRoom() != null ? table.getRoom().getName() : "";
        }

        public int getSeatCount() {
            return seats.size();
        }

        public double getTotalPrice() {
            return seats.stream()
                    .map(Seat::calcPrice)
                    .reduce(0.0, Double::sum);
        }
    }

    public record TicketGroup(TicketType type, List<TicketType> tickets) {
        public String getTypeName() {
            return switch (type) {
                case STUDENT -> "SchülerTicket";
                case GRADUATE -> "Ticket";
                case EXTERNAL -> "Standard Ticket";
            };
        }

        public int getCount() {
            return tickets.size();
        }

        public double getTotalPrice() {
            return tickets.stream()
                    .map(TicketType::getPrice)
                    .reduce(0.0, Double::sum);
        }

        public double getUnitPrice() {
            return type.getPrice();
        }
    }
}
