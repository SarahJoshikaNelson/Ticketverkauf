package at.htlleonding.repositories;

import at.htlleonding.types.TicketUpgrade;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TicketUpgradeRepo implements PanacheRepository<TicketUpgrade> {
}
