package at.htlleonding.types;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Graduate {
    @Id
    private String id;

    @Column(name = "tickets")
    private int freeTicketCount;
}