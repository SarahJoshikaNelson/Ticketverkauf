package at.htlleonding.types;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Maturant {
    @Id
    private String ldapUser; // LDAP-User from CSV

    private String firstName;
    private String lastName;
    private String className;
}

