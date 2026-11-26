package at.htlleonding.repositories;

import at.htlleonding.types.StringSetting;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class StringSettingRepo implements PanacheRepositoryBase<StringSetting, String> {
}
