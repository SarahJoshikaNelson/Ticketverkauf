package at.htlleonding.types.dtos;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TicketDesignDTO(
        UUID id,
        String name,
        int width,
        int height,
        @JsonProperty("frontPage")
        TicketPageDTO frontPage,
        @JsonProperty("backPage")
        TicketPageDTO backPage
) {
    public record TicketPageDTO(
            @JsonProperty("elements")
            List<DesignElementDTO> elements
    ) {}

    public record DesignElementDTO(
            String id,
            DesignElementTypes type,
            Optional<DesignElementFillers> filler,
            int x,
            int y,
            int width,
            int height,
            String content,
            Integer fontSize,
            String fontWeight,
            String color,
            Boolean isDynamic,
            String imageData,
            Boolean visible,
            Integer zIndex,
            Integer opacity,
            Integer borderRadius,
            Integer blurIntensity,
            String backgroundColor,
            Integer layer,
            Integer rotation
    ) {}

    public enum DesignElementFillers {
        CODE,
        DATE,
        TIME,
        NAME,
        ORDERNUMBER
    }

    public enum DesignElementTypes {
        TEXT,
        IMAGE,
        FIELD,
        BLUR,
        QR;

        public static DesignElementTypes fromString(String value) {
            return switch (value) {
                case "TEXT" -> TEXT;
                case "IMAGE" -> IMAGE;
                case "FIELD" -> FIELD;
                case "BLUR" -> BLUR;
                case "QR" -> QR;
                default -> throw new IllegalArgumentException("Invalid design element type: " + value);
            };
        } 
    }
}