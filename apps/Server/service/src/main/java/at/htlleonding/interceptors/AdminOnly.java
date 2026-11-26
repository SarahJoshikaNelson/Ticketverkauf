package at.htlleonding.interceptors;

import at.htlleonding.enums.AdminPriority;
import jakarta.ws.rs.NameBinding;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@NameBinding
@Retention(RetentionPolicy.RUNTIME)
public @interface AdminOnly {
    AdminPriority priority() default AdminPriority.HIGH;
}
