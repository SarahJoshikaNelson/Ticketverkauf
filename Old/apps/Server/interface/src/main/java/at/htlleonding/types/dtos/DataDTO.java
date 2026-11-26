package at.htlleonding.types.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.json.bind.annotation.JsonbProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DataDTO {
    private String title;
    private String subTitle;
    private LocalDate date;
    private LocalDate onDate; // Alias for date to match template expectations
    private String paymentInfo;
    private String paymentText;
    private String physicalPickupInfo;
    @JsonProperty("gif-url")
    @JsonbProperty("gif-url")
    private String gifUrl;

    // Footer configuration
    private String organizationName;
    private String organizationAddress;
    private String footerText;
    private String contactEmail;
    private String contactPhone;
    private String contactWebsite;
}