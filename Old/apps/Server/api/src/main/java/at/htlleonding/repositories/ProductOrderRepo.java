package at.htlleonding.repositories;

import at.htlleonding.types.ProductOrder;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ProductOrderRepo implements PanacheRepository<ProductOrder> {
}
