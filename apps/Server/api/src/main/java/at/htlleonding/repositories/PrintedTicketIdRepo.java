package at.htlleonding.repositories;

import at.htlleonding.types.PrintedTicketId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class PrintedTicketIdRepo implements PanacheRepositoryBase<PrintedTicketId, UUID> {
}
