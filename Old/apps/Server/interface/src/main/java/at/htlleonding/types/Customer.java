package at.htlleonding.types;

import at.htlleonding.types.dtos.CustomerDTO;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Set;
import java.util.UUID;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Customer implements Serializable {
    @Column(nullable = false)
    boolean isMale;
    @Column(nullable = false)
    String street;
    @Column(nullable = false)
    String streetNumber;
    @Column(nullable = false)
    String zipCode;
    @Column(nullable = false)
    String town;
    @Id
    @Column()
    private UUID id;
    @Column(nullable = false)
    private String firstName;
    @Column(nullable = false)
    private String lastName;
    @Column(nullable = false)
    private String mailAddress;
    @Column(nullable = false)
    private String phoneNumber;
    @Column()
    private String schoolClass;
    @OneToMany(mappedBy = "customer")
    private Set<Order> orders;

    public Customer(CustomerDTO dto) {
        this.id = UUID.randomUUID();
        this.firstName = dto.firstName();
        this.lastName = dto.lastName();
        this.mailAddress = dto.mailAddress();
        this.phoneNumber = dto.phoneNumber();
        this.schoolClass = dto.schoolClass();
        this.isMale = dto.isMale();
        this.street = dto.street();
        this.streetNumber = dto.streetNumber();
        this.zipCode = dto.zipCode();
        this.town = dto.town();
    }

    public Customer(String firstName, String lastName, String mailAddress, String phoneNumber, String schoolClass, boolean isMale, String street, String streetNumber, String zipCode, String town) {
        this.id = UUID.randomUUID();
        this.firstName = firstName;
        this.lastName = lastName;
        this.mailAddress = mailAddress;
        this.phoneNumber = phoneNumber;
        this.schoolClass = schoolClass;
        this.isMale = isMale;
        this.street = street;
        this.streetNumber = streetNumber;
        this.zipCode = zipCode;
        this.town = town;
    }
}
