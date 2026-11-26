package at.htlleonding.types;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;

@Entity
@jakarta.persistence.Table(name = "order_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderCache extends PanacheEntityBase {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(columnDefinition = "TEXT")
    String reservation;

    public OrderCache(String reservation) {
        this.reservation = reservation;
    }
}
