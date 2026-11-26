package at.htlleonding.repositories;

import at.htlleonding.types.Room;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

@ApplicationScoped
@NoArgsConstructor
public class RoomRepo implements PanacheRepositoryBase<Room, String> {
}
