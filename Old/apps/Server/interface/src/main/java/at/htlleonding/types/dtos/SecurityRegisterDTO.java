package at.htlleonding.types.dtos;

import at.htlleonding.enums.AdminPriority;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SecurityRegisterDTO {
    private String username;
    private String password;
    private AdminPriority priority;
}
