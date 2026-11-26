package at.htlleonding.repositories;

import at.htlleonding.types.Ticket;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

import java.util.UUID;

@ApplicationScoped
@NoArgsConstructor
public class TicketRepo implements PanacheRepositoryBase<Ticket, UUID> {
}
