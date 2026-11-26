package at.htlleonding.extensions;

import at.htlleonding.types.dtos.admin.OrderDetailDTO;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import io.quarkus.qute.TemplateExtension;
import lombok.experimental.UtilityClass;

@TemplateExtension
@UtilityClass
public class TicketPriceExtension {
    public static double calculateTotalPrice(OrderDetailDTO orderDetail, double additionalChargeForPhysicalTickets) {
        double totalPrice = 0;

        if (orderDetail.order().seats() != null) {
            totalPrice += orderDetail.order().seats()
                    .stream()
                    .map(seat -> seat.getPrice(seat))
                    .reduce(0.0, Double::sum);
        }

        if (orderDetail.order().tickets() != null) {
            totalPrice += orderDetail.order().tickets()
                    .stream()
                    .map(ticket -> ticket.getTotalPrice(ticket, additionalChargeForPhysicalTickets))
                    .reduce(0.0, Double::sum);
        }

        return totalPrice;
    }

    public static double calculateTotalPrice(OrderMailDTO orderDetail, double additionalChargeForPhysicalTickets) {
        double totalPrice = 0;

        if (orderDetail.order().seats() != null) {
            totalPrice += orderDetail.order().seats()
                    .stream()
                    .map(seat -> seat.getPrice(seat))
                    .reduce(0.0, Double::sum);
        }

        if (orderDetail.order().tickets() != null) {
            totalPrice += orderDetail.order().tickets()
                    .stream()
                    .map(ticket -> ticket.getTotalPrice(ticket, additionalChargeForPhysicalTickets))
                    .reduce(0.0, Double::sum);
        }

        return totalPrice;
    }
}