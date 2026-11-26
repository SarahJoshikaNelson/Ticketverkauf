package at.htlleonding.types.dtos.mails;

import at.htlleonding.types.Data;
import at.htlleonding.types.Order;
import at.htlleonding.types.dtos.ReservationDTO;

public record ActivationMailDTO(
        ReservationDTO reservation,
        Data data,
        Order order
) {
}
