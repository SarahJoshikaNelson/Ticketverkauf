package at.htlleonding.types.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@JsonIgnoreProperties(ignoreUnknown = true)
public class StripeWebhookDTO {
    public String id;
    public String object;
    public String type;
    public Data data;

    public static StripeWebhookDTO fromJson(String json) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        return mapper.readValue(json, StripeWebhookDTO.class);
    }

    public String toJson() {
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(this);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return "{}";
        }
    }

    @Override
    public String toString() {
        return toJson();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Data {
        public StripeEventDTO object;
    }
}
