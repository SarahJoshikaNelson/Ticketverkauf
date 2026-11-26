package at.htlleonding;

import at.htlleonding.repositories.SeatRepo;
import at.htlleonding.types.Seat;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.UUID;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class SeatManager {
    private SeatRepo seatRepo;

    public Seat findSeatById(UUID id) {
        return seatRepo.findById(id);
    }

    public boolean updatePrice(UUID id, double price) {
        Seat seat = seatRepo.findById(id);
        seat.setPrice(price);
        seatRepo.persist(seat);
        return true;
    }
}