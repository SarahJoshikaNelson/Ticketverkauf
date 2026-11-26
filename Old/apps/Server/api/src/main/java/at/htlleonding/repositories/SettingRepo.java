package at.htlleonding.repositories;

import at.htlleonding.types.Setting;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SettingRepo implements PanacheRepositoryBase<Setting, String> {
}
