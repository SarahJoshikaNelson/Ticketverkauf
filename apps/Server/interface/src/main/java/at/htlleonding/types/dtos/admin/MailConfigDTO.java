package at.htlleonding.types.dtos.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MailConfigDTO {
    private String host;
    private Integer port;
    private String username;
    private String password;
    private String fromName;
    private String fromAddress;
}
