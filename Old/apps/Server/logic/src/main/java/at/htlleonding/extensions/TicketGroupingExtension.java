package at.htlleonding.extensions;

import at.htlleonding.enums.TicketType;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Table;
import at.htlleonding.types.Ticket;
import at.htlleonding.types.dtos.ReservationDTO;
import at.htlleonding.types.dtos.SeatDTO;
import at.htlleonding.types.dtos.TicketDTO;
import at.htlleonding.types.dtos.admin.OrderDTO;
import io.quarkus.qute.TemplateExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@TemplateExtension
public class TicketGroupingExtension {

    // Extension methods for ReservationDTO
    public static List<EntityTicketGroup> groupedTickets(ReservationDTO reservation) {
        return groupTicketEntities(reservation.tickets());
    }

    public static List<EntityTableGroup> groupedTables(ReservationDTO reservation) {
        return groupSeatEntities(reservation.seats());
    }

    // Extension methods for OrderDTO
    public static List<DtoTicketGroup> groupedTickets(OrderDTO order) {
        return groupTicketDTOs(order.tickets());
    }

    public static List<DtoTableGroup> groupedTables(OrderDTO order) {
        return groupSeatDTOs(order.seats());
    }

    // Helper: Group Ticket entities by type and physical status
    private static List<EntityTicketGroup> groupTicketEntities(List<Ticket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return List.of();
        }

        record TicketKey(TicketType type, boolean isPhysical) {
        }

        Map<TicketKey, List<Ticket>> grouped = tickets.stream()
                .collect(Collectors.groupingBy(ticket -> new TicketKey(ticket.getTicketType(), ticket.isPhysical())));

        return grouped.entrySet().stream()
                .map(entry -> new EntityTicketGroup(
                        entry.getKey().type(),
                        entry.getKey().isPhysical(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // Helper: Group Seat entities by table
    private static List<EntityTableGroup> groupSeatEntities(List<Seat> seats) {
        if (seats == null || seats.isEmpty()) {
            return List.of();
        }

        Map<Table, List<Seat>> grouped = seats.stream()
                .filter(seat -> seat.getTable() != null)
                .collect(Collectors.groupingBy(Seat::getTable));

        return grouped.entrySet().stream()
                .map(entry -> new EntityTableGroup(
                        entry.getKey(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // Helper: Group TicketDTO by type and physical status
    private static List<DtoTicketGroup> groupTicketDTOs(List<TicketDTO> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return List.of();
        }

        record TicketKey(String type, boolean isPhysical) {
        }

        Map<TicketKey, List<TicketDTO>> grouped = tickets.stream()
                .collect(Collectors.groupingBy(ticket -> new TicketKey(ticket.type().toString(), ticket.isPhysical())));

        return grouped.entrySet().stream()
                .map(entry -> new DtoTicketGroup(
                        entry.getKey().type(),
                        entry.getKey().isPhysical(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // Helper: Group SeatDTO by table
    private static List<DtoTableGroup> groupSeatDTOs(List<SeatDTO> seats) {
        if (seats == null || seats.isEmpty()) {
            return List.of();
        }

        Map<String, List<SeatDTO>> grouped = seats.stream()
                .filter(seat -> seat.tableName() != null && !seat.tableName().isEmpty())
                .collect(Collectors.groupingBy(SeatDTO::tableName));

        return grouped.entrySet().stream()
                .map(entry -> new DtoTableGroup(
                        entry.getKey(),
                        entry.getValue()
                ))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // Records for entity-based groups (ReservationDTO)
    public static record EntityTableGroup(Table table, List<Seat> seats) {
        public String tableName() {
            return table.getName();
        }

        public String roomName() {
            return table.getRoom() != null ? table.getRoom().getName() : "";
        }

        public int seatCount() {
            return seats.size();
        }

        public double price() {
            return seats.stream()
                    .map(Seat::calcPrice)
                    .reduce(0.0, Double::sum);
        }

        // Alias for template compatibility
        public double totalPrice() {
            return price();
        }
    }

    public static record EntityTicketGroup(TicketType type, boolean isPhysical, List<Ticket> tickets) {
        public int count() {
            return tickets.size();
        }

        public double totalPrice() {
            return tickets.stream()
                    .map(Ticket::calcPrice)
                    .reduce(0.0, Double::sum);
        }

        public double unitPrice() {
            return type.getPrice();
        }

        public double totalAdditionalCharge(double additionalChargePerTicket) {
            return isPhysical ? count() * additionalChargePerTicket : 0.0;
        }

        public String typeName() {
            return switch (type) {
                case STUDENT -> "Schüler Ticket";
                case GRADUATE -> "Ticket";
                case EXTERNAL -> "Standard Ticket";
            };
        }
    }

    // Records for DTO-based groups (OrderDTO)
    public static record DtoTableGroup(String tableName, List<SeatDTO> seats) {
        public int seatCount() {
            return seats.size();
        }

        public double totalPrice() {
            return seats.stream()
                    .map(SeatDTO::price)
                    .reduce(0.0, Double::sum);
        }
    }

    public static record DtoTicketGroup(String type, boolean isPhysical, List<TicketDTO> tickets) {
        public int count() {
            return tickets.size();
        }

        public double totalPrice() {
            return tickets.stream()
                    .map(TicketDTO::price)
                    .reduce(0.0, Double::sum);
        }

        public double unitPrice() {
            return tickets.isEmpty() ? 0.0 : tickets.getFirst().price();
        }

        public double totalAdditionalCharge(double additionalChargePerTicket) {
            return isPhysical ? count() * additionalChargePerTicket : 0.0;
        }

        public String typeName() {
            return switch (type) {
                case "STUDENT" -> "Schüler Ticket";
                case "GRADUATE" -> "Ticket";
                case "EXTERNAL" -> "Standard Ticket";
                default -> "Ticket";
            };
        }
    }
}
