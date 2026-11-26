package at.htlleonding.types;

import at.htlleonding.enums.TicketType;
import at.htlleonding.types.dtos.TicketDTO;
import com.fasterxml.jackson.annotation.JsonBackReference;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Ticket extends PanacheEntityBase implements Serializable {
    @Id
    @Column(length = 21)
    @GeneratedValue
    private UUID id;

    @ManyToOne(cascade = CascadeType.ALL)
    @JsonBackReference
    private Order order;

    @Column(nullable = false)
    private TicketType ticketType;

    @Column(nullable = false)
    private boolean isActivated = false;

    @Column
    private LocalDateTime activatedAt;

    @Column(nullable = false)
    private boolean isPhysical;

    public Ticket(TicketDTO ticketDTO, Order order, boolean isPhysical) {
        this.order = order;
        this.ticketType = ticketDTO.type();
        this.isPhysical = isPhysical;
    }

    public Ticket(TicketType type, Order order, boolean isPhysical) {
        this.order = order;
        this.ticketType = type;
        this.isPhysical = isPhysical;
    }

    public void setTicketType(TicketType ticketType) {
        this.ticketType = ticketType;
    }

    public String toString() {
        return this.ticketType.toString();
    }

    public double calcPrice() {
        return this.ticketType.getPrice();
    }

    public String calcPriceFormatted() {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("de-AT"));
        return formatter.format(calcPrice());
    }

    public double calcTotalPrice(double additionalChargeForPhysicalTickets) {
        return calcPrice() + (isPhysical ? additionalChargeForPhysicalTickets : 0.0);
    }

    public String calcTotalPriceFormatted(double additionalChargeForPhysicalTickets) {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("de-AT"));
        return formatter.format(calcTotalPrice(additionalChargeForPhysicalTickets));
    }
}
