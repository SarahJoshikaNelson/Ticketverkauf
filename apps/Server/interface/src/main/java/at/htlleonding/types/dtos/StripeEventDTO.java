package at.htlleonding.types.dtos;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.Getter;
import lombok.Setter;

@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@Setter
public class StripeEventDTO {
    public String id;
    public String object;
    public Long amount_subtotal;
    public Long amount_total;
    public AutomaticTax automatic_tax;
    public Long created;
    public String currency;
    public List<Object> custom_fields;
    public CustomText custom_text;
    public String customer;
    public String customer_creation;
    public Object customer_details;
    public String customer_email;
    public Long expires_at;
    public InvoiceCreation invoice_creation;
    public Boolean livemode;
    public String locale;
    public Map<String, String> metadata;
    public String mode;
    public String payment_intent;
    public String payment_link;
    public String payment_method_collection;
    public Map<String, Object> payment_method_options;
    public List<String> payment_method_types;
    public String payment_status;
    public PhoneNumberCollection phone_number_collection;
    public String status;
    public String success_url;
    public TotalDetails total_details;
    public String url;

    // Method to create DTO from JSON string
    public static StripeEventDTO fromJson(String json) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        return mapper.readValue(json, StripeEventDTO.class);
    }

    // Method to convert DTO to JSON string
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

    // Nested classes for objects in the JSON
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AutomaticTax {
        public Boolean enabled;
        public Object liability;
        public Object status;

        @Override
        public String toString() {
            return "AutomaticTax{" +
                    "enabled=" + enabled +
                    ", liability=" + liability +
                    ", status=" + status +
                    '}';
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CustomText {
        public Object shipping_address;
        public Object submit;

        @Override
        public String toString() {
            return "CustomText{" +
                    "shipping_address=" + shipping_address +
                    ", submit=" + submit +
                    '}';
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InvoiceCreation {
        public Boolean enabled;
        public InvoiceData invoice_data;

        @Override
        public String toString() {
            return "InvoiceCreation{" +
                    "enabled=" + enabled +
                    ", invoice_data=" + invoice_data +
                    '}';
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InvoiceData {
        public Object account_tax_ids;
        public Object custom_fields;
        public Object description;
        public Object footer;
        public Object issuer;
        public Map<String, String> metadata;
        public Object rendering_options;

        @Override
        public String toString() {
            return "InvoiceData{" +
                    "account_tax_ids=" + account_tax_ids +
                    ", custom_fields=" + custom_fields +
                    ", description=" + description +
                    ", footer=" + footer +
                    ", issuer=" + issuer +
                    ", metadata=" + metadata +
                    ", rendering_options=" + rendering_options +
                    '}';
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PhoneNumberCollection {
        public Boolean enabled;

        @Override
        public String toString() {
            return "PhoneNumberCollection{" +
                    "enabled=" + enabled +
                    '}';
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TotalDetails {
        public Long amount_discount;
        public Long amount_shipping;
        public Long amount_tax;

        @Override
        public String toString() {
            return "TotalDetails{" +
                    "amount_discount=" + amount_discount +
                    ", amount_shipping=" + amount_shipping +
                    ", amount_tax=" + amount_tax +
                    '}';
        }
    }
}
