package at.htlleonding.repositories;

import at.htlleonding.types.Customer;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class CustomerRepo implements PanacheRepositoryBase<Customer, UUID> {
}
