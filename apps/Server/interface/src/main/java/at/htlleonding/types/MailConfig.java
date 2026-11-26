package at.htlleonding.types;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class MailConfig {

    @Id
    private Long id;

    private String host;
    private Integer port;
    private String username;
    private String password;
    
    // Fallbacks if not set
    private String fromName;
    private String fromAddress;
}
