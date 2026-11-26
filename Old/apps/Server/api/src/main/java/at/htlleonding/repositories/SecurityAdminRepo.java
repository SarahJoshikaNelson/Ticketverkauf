package at.htlleonding.repositories;

import at.htlleonding.types.SecurityAdmin;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SecurityAdminRepo implements PanacheRepositoryBase<SecurityAdmin, Integer> {
}
