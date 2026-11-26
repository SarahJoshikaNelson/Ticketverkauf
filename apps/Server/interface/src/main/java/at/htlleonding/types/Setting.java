package at.htlleonding.types;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Setting {
    @Id
    @Column
    private String key;

    @Column
    private double value;
}
