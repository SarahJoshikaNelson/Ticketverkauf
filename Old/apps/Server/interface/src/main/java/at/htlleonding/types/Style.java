package at.htlleonding.types;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Style {
    @Id
    @GeneratedValue
    private Integer id;

    @Column(name = "primary_color")
    private String primary;

    @Column(name = "secondary_color")
    private String secondary;
    private String accent;
    private int borderRadius;
    private String background;

    @Column(name = "text_color")
    private String text;
}