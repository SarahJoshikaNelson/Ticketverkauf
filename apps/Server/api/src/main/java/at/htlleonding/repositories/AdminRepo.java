package at.htlleonding.repositories;

import at.htlleonding.types.Admin;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AdminRepo implements PanacheRepositoryBase<Admin, String> {
}
