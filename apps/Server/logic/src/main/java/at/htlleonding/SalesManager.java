package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.TicketType;
import at.htlleonding.models.SalesSummary;
import at.htlleonding.repositories.OrderRepo;
import at.htlleonding.types.Order;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Ticket;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class SalesManager {
    private OrderRepo orderRepo;
    private TicketManager ticketManager;

    public double getFullProfit() {
        List<Order> orders = orderRepo.listAll().stream()
                .filter(order -> order.getStatus().equals(OrderStatus.PAID) || order.getStatus().equals(OrderStatus.DONE))
                .collect(Collectors.toCollection(ArrayList::new));

        return orders.stream()
                .mapToDouble(order -> order.getTickets().stream()
                        .mapToDouble(ticket -> ticket.calcPrice() + (
                                ticket.isPhysical()
                                        ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                        : 0.0
                        ))
                        .sum())
                .sum();
    }

    public SalesSummary getFullProfitDetailed() {
        List<Order> orders = orderRepo.listAll().stream()
                .filter(order -> order.getStatus().equals(OrderStatus.PAID) || order.getStatus().equals(OrderStatus.DONE))
                .collect(Collectors.toCollection(ArrayList::new));

        return fromOrderList(orders);
    }

    public SalesSummary getFullPossibleProfitDetailed() {
        List<Order> orders = orderRepo.listAll().stream()
                .filter(order -> order.getStatus().equals(OrderStatus.PAID) || order.getStatus().equals(OrderStatus.DONE)
                        || order.getStatus().equals(OrderStatus.CONFIRMED))
                .collect(Collectors.toCollection(ArrayList::new));

        return fromOrderList(orders);
    }

    private SalesSummary fromOrderList(List<Order> orders) {
        double studentProfit = orders.stream()
                .mapToDouble(order -> order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.STUDENT))
                        .mapToDouble(ticket -> ticket.calcPrice() + (ticket.isPhysical()
                                ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                : 0.0))
                        .sum())
                .sum();

        double externalProfit = orders.stream()
                .mapToDouble(order -> order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.EXTERNAL))
                        .mapToDouble(ticket -> ticket.calcPrice() + (ticket.isPhysical()
                                ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                : 0))
                        .sum())
                .sum();

        int studentTickets = orders.stream()
                .mapToInt(order -> (int) order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.STUDENT))
                        .count())
                .sum();

        int externalTickets = orders.stream()
                .mapToInt(order -> (int) order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.EXTERNAL))
                        .count())
                .sum();

        int freeTickets = orders.stream()
                .mapToInt(order -> (int) order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.GRADUATE))
                        .count())
                .sum();

        double tableProfitDouble = orders.stream()
                .flatMap(order -> order.getSeats().stream())
                .map(Seat::calcPrice)
                .mapToDouble(price -> price)
                .sum();

        long tableCount = orders.stream()
                .mapToLong(order -> order.getSeats().size())
                .sum();

        long physicalStudentTickets = orders.stream()
                .mapToLong(order -> order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.STUDENT))
                        .filter(Ticket::isPhysical)
                        .count())
                .sum();

        long physicalExternalTickets = orders.stream()
                .filter(order -> order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.EXTERNAL))
                        .anyMatch(Ticket::isPhysical))
                .mapToLong(order -> order.getTickets().stream()
                        .filter(ticket -> ticket.getTicketType().equals(TicketType.EXTERNAL))
                        .filter(Ticket::isPhysical)
                        .count())
                .sum();

        double[] pastWeekProfit = new double[7];
        long[] pastWeekOrderCount = new long[7];
        double[] pastWeekExternalProfit = new double[7];
        double[] pastWeekStudentProfit = new double[7];
        double[] pastWeekTableProfit = new double[7];
        int[] pastWeekPhysicalTickets = new int[7];

        ZoneId viennaZone = ZoneId.of("Europe/Vienna");

        for (int finalI = 0; finalI < 7; finalI++) {
            LocalDate today = LocalDate.now(viennaZone);
            LocalDate targetDate = today.minusDays(finalI);

            pastWeekProfit[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .mapToDouble(order -> order.getTickets().stream()
                            .mapToDouble(ticket -> ticket.calcPrice() + (
                                    ticket.isPhysical()
                                            ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                            : 0.0
                            ))
                            .sum())
                    .sum();
            pastWeekOrderCount[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .count();
            pastWeekExternalProfit[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .mapToDouble(order -> order.getTickets().stream().filter(
                                    ticket -> ticket.getTicketType().equals(TicketType.EXTERNAL))
                            .mapToDouble(ticket -> ticket.calcPrice() + (
                                    ticket.isPhysical()
                                            ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                            : 0.0
                            ))
                            .sum())
                    .sum();
            pastWeekStudentProfit[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .mapToDouble(order -> order.getTickets().stream().filter(
                                    ticket -> ticket.getTicketType().equals(TicketType.STUDENT))
                            .mapToDouble(ticket -> ticket.calcPrice() + (
                                    ticket.isPhysical()
                                            ? ticketManager.getAdditionalChargeForPhysicalTicket()
                                            : 0
                            ))
                            .sum()
                    )
                    .sum();
            pastWeekTableProfit[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .flatMap(order -> order.getSeats().stream())
                    .map(Seat::calcPrice)
                    .mapToDouble(price -> price)
                    .sum();

            pastWeekPhysicalTickets[finalI] = orders.stream()
                    .filter(order -> order.getOrderDate().atZone(viennaZone).toLocalDate()
                            .equals(targetDate))
                    .mapToInt(order -> (int) order.getTickets().stream()
                            .filter(ticket -> ticket.getTicketType().equals(TicketType.STUDENT))
                            .filter(Ticket::isPhysical)
                            .count())
                    .sum();
        }

        return new SalesSummary(
                studentProfit,
                externalProfit,
                studentTickets,
                externalTickets,
                freeTickets,
                tableProfitDouble,
                pastWeekProfit,
                pastWeekOrderCount,
                orders.size(),
                tableCount,
                pastWeekExternalProfit,
                pastWeekStudentProfit,
                pastWeekTableProfit,
                pastWeekPhysicalTickets,
                physicalStudentTickets,
                physicalExternalTickets);
    }
}
