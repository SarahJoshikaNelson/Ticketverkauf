package at.htlleonding.repositories;

import at.htlleonding.types.Graduate;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class GraduateRepo implements PanacheRepositoryBase<Graduate, String> {
}
