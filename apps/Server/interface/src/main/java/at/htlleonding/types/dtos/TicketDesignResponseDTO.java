package at.htlleonding.types.dtos;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import at.htlleonding.types.dtos.TicketDesignDTO.DesignElementTypes;
import at.htlleonding.types.dtos.TicketDesignDTO.DesignElementFillers;

public record TicketDesignResponseDTO(
        UUID id,
        String name,
        int width,
        int height,
        @JsonProperty("frontPage")
        TicketPageDTO frontPage,
        @JsonProperty("backPage")
        TicketPageDTO backPage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Boolean active
) {
    public record TicketPageDTO(
            @JsonProperty("elements")
            List<DesignElementResponseDTO> elements
    ) {}

    public record DesignElementResponseDTO(
            String id,
            DesignElementTypes type,
            DesignElementFillers filler,
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
} 