package at.htlleonding.types.dtos;

import java.util.List;

public record ShopOrderMailDTO(
        String recipientEmail,
        String recipientName,
        List<LineDTO> lines,
        double total,
        boolean isUpgrade
) {
    public record LineDTO(
            String title,
            int quantity,
            double unitPrice
    ) {
        public double totalPrice() {
            return quantity * unitPrice;
        }
    }
}
