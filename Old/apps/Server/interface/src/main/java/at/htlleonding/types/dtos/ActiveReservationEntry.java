package at.htlleonding.types.dtos;

import java.util.concurrent.ScheduledFuture;

public record ActiveReservationEntry(
        String sessionId,
        ScheduledFuture<?> future
) {
}
