package at.htlleonding.repositories;

import at.htlleonding.types.ScheduleEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ScheduleRepo implements PanacheRepositoryBase<ScheduleEntry, String> {
}
