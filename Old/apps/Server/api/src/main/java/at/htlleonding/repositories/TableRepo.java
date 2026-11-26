package at.htlleonding.repositories;

import at.htlleonding.types.Table;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

@ApplicationScoped
@NoArgsConstructor
public class TableRepo implements PanacheRepositoryBase<Table, String> {
}
