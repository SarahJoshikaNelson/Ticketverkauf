package at.htlleonding.types.dtos;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public record SeatDTO(
        UUID id,
        int xPosition,
        int yPosition,
        int xLength,
        int yLength,
        double price,
        boolean taken,
        String tableName
) {
    public double getPrice(SeatDTO dto) {
        return dto.price();
    }

    public double calcPrice() {
        return this.price;
    }

    public String calcPriceFormatted() {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("de-AT"));
        return formatter.format(this.price);
    }

    // Methods for template compatibility - these will need to be populated with table info
    public String getTableName() {
        return this.tableName != null ? this.tableName : "";
    }

    public List<SeatDTO> getSeats() {
        return List.of(); // Will be set when creating SeatDTO from Seat
    }

    public String getRoom() {
        return ""; // Will be set when creating SeatDTO from Seat
    }

    public Object getTable() {
        return null; // Will be set when creating SeatDTO from Seat
    }
}
