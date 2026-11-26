package at.htlleonding.types;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.types.dtos.admin.OrderDTO;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@jakarta.persistence.Table(name = "\"order\"")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Order extends PanacheEntityBase implements Serializable {
    @Id
    @GeneratedValue
    private UUID id;

    @CreationTimestamp
    private LocalDateTime orderDate;

    @OneToMany(cascade = CascadeType.REMOVE, mappedBy = "order")
    @JsonManagedReference
    private Set<Ticket> tickets;

    @ManyToOne
    private User user;

    @OneToMany(mappedBy = "order")
    @JsonManagedReference
    private List<Seat> seats;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;
    
    @Column(unique = true)
    private Long invoiceNumber;

    @ManyToOne(cascade = CascadeType.REMOVE)
    private Customer customer;

    public Order(OrderDTO dto) {
        this.status = dto.status();
        this.orderDate = dto.orderDate();
        this.tickets = dto.tickets()
                .stream()
                .map(ticketDTO -> new Ticket(ticketDTO, this, ticketDTO.isPhysical()))
                .collect(Collectors.toSet());
        this.seats = dto.seats().stream().map(Seat::new).collect(Collectors.toList());
    }

    public Order(Customer customer) {
        this.customer = customer;
        this.status = OrderStatus.WAITING;
        this.orderDate = LocalDateTime.now();
    }

    public double getRevenue() {
        double revenue = 0;
        for (Ticket ticket : this.tickets)
            revenue += ticket.calcPrice();
        return revenue;
    }

    // Template compatibility - seats can be accessed as table items
    public List<Seat> getTableItems() {
        return seats;
    }
}
