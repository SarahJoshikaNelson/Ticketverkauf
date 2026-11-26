package at.htlleonding.repositories;

import at.htlleonding.types.DesignElement;
import jakarta.enterprise.context.ApplicationScoped;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import java.util.UUID;


@ApplicationScoped
public class DesignElementRepo implements PanacheRepositoryBase<DesignElement, UUID> {    
}