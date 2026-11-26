package at.htlleonding.types;

import at.htlleonding.enums.AdminPriority;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SecurityAdmin {
    @Id
    @GeneratedValue
    private int id;

    private String username;

    private String passwordHash;

    @Enumerated
    private AdminPriority priority;
}
