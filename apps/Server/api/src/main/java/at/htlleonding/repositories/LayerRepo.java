package at.htlleonding.repositories;

import at.htlleonding.types.Layer;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class LayerRepo implements PanacheRepository<Layer> {
}
