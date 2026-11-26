package at.htlleonding.types;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class StringSetting {
    @Id
    private String key;

    private String value;
}
