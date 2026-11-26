package at.htlleonding.repositories;

import at.htlleonding.types.Style;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class StyleRepo implements PanacheRepositoryBase<Style, Integer> {
}
