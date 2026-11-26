package at.htlleonding.repositories;

import at.htlleonding.types.OrderCache;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

import java.util.UUID;

@ApplicationScoped
@NoArgsConstructor
public class OrderCacheRepo implements PanacheRepositoryBase<OrderCache, UUID> {
    
}
