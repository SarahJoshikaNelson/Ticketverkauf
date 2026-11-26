package at.htlleonding.types;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

import at.htlleonding.types.dtos.TicketDesignDTO;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "design_element")
public class DesignElement {
    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    private TicketDesignDTO.DesignElementTypes type;

    @Enumerated(EnumType.STRING)
    private TicketDesignDTO.DesignElementFillers filler;

    @ManyToOne
    @JoinColumn(name = "design_page_id")
    @JsonIgnore
    private DesignPage designPage;

    private String content;
    private int x;
    private int y;
    private int width;
    private int height;
    private int rotation;
    private int zIndex;
    
    // Text styling properties
    private Integer fontSize;
    private String fontWeight;
    private String color;
    
    // Element state properties
    private Boolean isDynamic;
    private Boolean visible;
    
    // Image properties
    @Column(columnDefinition = "TEXT")
    private String imageData; // base64 image data
    
    // Blur element properties
    private Integer opacity; // 0-100
    private Integer borderRadius; // 0-50
    private Integer blurIntensity; // 0-20 (blur amount in px)
    private String backgroundColor; // Color for blur blocks
    private Integer layer;

    public DesignElement(TicketDesignDTO.DesignElementTypes type, TicketDesignDTO.DesignElementFillers filler, DesignPage designPage, String content, int x, int y, int width, int height, int rotation, int zIndex, Integer fontSize, String fontWeight, String color, Boolean isDynamic, Boolean visible, String imageData, Integer opacity, Integer borderRadius, Integer blurIntensity, String backgroundColor, Integer layer) {
        this.type = type;
        this.filler = filler;
        this.designPage = designPage;
        this.content = content;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.zIndex = zIndex;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.color = color;
        this.isDynamic = isDynamic;
        this.visible = visible;
        this.imageData = imageData;
        this.opacity = opacity;
        this.borderRadius = borderRadius;
        this.blurIntensity = blurIntensity;
        this.backgroundColor = backgroundColor;
        this.layer = layer;
    }

    public DesignElement() {
        this.type = TicketDesignDTO.DesignElementTypes.TEXT;
        this.filler = TicketDesignDTO.DesignElementFillers.CODE;
        this.designPage = null;
        this.content = "";
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.rotation = 0;
        this.zIndex = 0;
        this.fontSize = 0;
        this.fontWeight = "normal";
        this.color = "#000000";
        this.isDynamic = false;
        this.visible = true;
        this.imageData = null;
        this.opacity = 100;
        this.borderRadius = 0;
        this.blurIntensity = 0;
        this.backgroundColor = "#FFFFFF";
        this.layer = 0;
    }
}
