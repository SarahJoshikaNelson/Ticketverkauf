package at.htlleonding.repositories;

import java.util.UUID;

import at.htlleonding.types.TicketDesign;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TicketDesignRepo implements PanacheRepositoryBase<TicketDesign, UUID> {
} 