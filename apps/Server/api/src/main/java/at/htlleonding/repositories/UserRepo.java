package at.htlleonding.repositories;

import at.htlleonding.types.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

@ApplicationScoped
@NoArgsConstructor
public class UserRepo implements PanacheRepository<User> {
}
