package at.htlleonding.repositories;

import at.htlleonding.types.DesignPage;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class DesignPageRepo implements PanacheRepositoryBase<DesignPage, UUID> {
}
