package at.htlleonding.repositories;

import at.htlleonding.types.Maturant;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MaturantRepo implements PanacheRepositoryBase<Maturant, String> {
}

