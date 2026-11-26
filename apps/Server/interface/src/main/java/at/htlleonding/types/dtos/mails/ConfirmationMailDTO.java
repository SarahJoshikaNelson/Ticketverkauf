package at.htlleonding.types.dtos.mails;

import at.htlleonding.types.Data;
import at.htlleonding.types.dtos.ReservationDTO;

import java.util.UUID;

public record ConfirmationMailDTO(
        UUID orderID,
        ReservationDTO reservation,
        Data data
) {
}
