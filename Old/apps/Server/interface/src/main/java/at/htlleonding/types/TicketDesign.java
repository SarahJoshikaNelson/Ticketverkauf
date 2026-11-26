package at.htlleonding.types;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@jakarta.persistence.Table(name = "ticket_design")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketDesign {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @OneToMany(mappedBy = "ticketDesign", cascade = CascadeType.ALL)
    private List<DesignPage> pages;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Boolean active;

    public TicketDesign(String name, int width, int height, List<DesignPage> pages) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.pages = pages;
        this.active = false;
    }
}