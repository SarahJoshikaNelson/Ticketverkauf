package at.htlleonding.repositories;

import at.htlleonding.types.MailConfig;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MailConfigRepo implements PanacheRepository<MailConfig> {
}
