package at.htlleonding.repositories;

import at.htlleonding.types.Data;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class DataRepo implements PanacheRepositoryBase<Data, Integer> {
}
