package at.htlleonding.types;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Getter
@Setter
public class StudentOrder {
    @Id
    private UUID id;

    @ManyToOne
    private Student student;

    @ManyToOne
    private Order order;
}
