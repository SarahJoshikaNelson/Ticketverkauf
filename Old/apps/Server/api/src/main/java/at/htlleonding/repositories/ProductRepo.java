package at.htlleonding.repositories;

import at.htlleonding.types.Product;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ProductRepo implements PanacheRepository<Product> {
}
