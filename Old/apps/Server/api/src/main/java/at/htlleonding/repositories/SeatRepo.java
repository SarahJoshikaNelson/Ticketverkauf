package at.htlleonding.repositories;

import at.htlleonding.types.Seat;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

import java.util.UUID;

@ApplicationScoped
@NoArgsConstructor
public class SeatRepo implements PanacheRepositoryBase<Seat, UUID> {
    public boolean isSeatTaken(UUID seatId) {
        return count("id = ?1 AND order IS NOT NULL", seatId) > 0;
    }
}
