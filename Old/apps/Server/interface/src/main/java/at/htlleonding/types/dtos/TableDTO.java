package at.htlleonding.types.dtos;

import at.htlleonding.types.Room;
import at.htlleonding.types.Seat;

import java.util.List;

public record TableDTO(
        String name,
        Room room,
        int xPosition,
        int yPosition,
        int xLength,
        int yLength,
        boolean selectable,
        List<Seat> seats
) {
    public double calcPrice() {
        return this.seats.stream().map(Seat::calcPrice).reduce(0.0, Double::sum);
    }
}