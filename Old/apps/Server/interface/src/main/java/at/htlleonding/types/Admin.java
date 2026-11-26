package at.htlleonding.types;

import at.htlleonding.enums.AdminPriority;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Admin implements Serializable {
    @Id
    private String id;

    private String adminName;

    @Enumerated
    private AdminPriority priority;
}
