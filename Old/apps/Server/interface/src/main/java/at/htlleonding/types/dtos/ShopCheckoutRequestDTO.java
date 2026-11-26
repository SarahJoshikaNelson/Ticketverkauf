package at.htlleonding.types.dtos;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public record ShopCheckoutRequestDTO(
        String email,
        List<ItemDTO> items,
        List<UpgradeDTO> upgrades,
        List<String> reservedTicketIds
) {
    public record ItemDTO(Long productId, int quantity) {}
    public record UpgradeDTO(String ticketType, int quantity) {}

    public static ShopCheckoutRequestDTO fromJson(String json) {
        try {
            return new ObjectMapper().readValue(json, ShopCheckoutRequestDTO.class);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return null;
        }
    }

    public String toJson() {
        try {
            return new ObjectMapper().writeValueAsString(this);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return null;
        }
    }
}
