package at.htlleonding.types;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "UserAccount")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class User {
   @Id
   @GeneratedValue(strategy = GenerationType.AUTO)
   private UUID id;
   
   @Column(nullable = false)
   private String username;
   @Column(nullable = false)
   private String mailAddress;
   @Column(nullable = true)
   private String passwordHash; // if no password is provided, it's a student account that needs authentication through the schools LDAP system
}
