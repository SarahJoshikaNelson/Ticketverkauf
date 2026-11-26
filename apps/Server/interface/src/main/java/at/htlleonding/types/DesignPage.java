package at.htlleonding.types;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.OneToMany;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;
import at.htlleonding.enums.PageType;

@Getter
@Setter
@Entity
@Table(name = "design_page")
public class DesignPage {
    @Id
    @GeneratedValue
    private UUID id;

    @OneToMany
    @JoinColumn(name = "design_page_id")
    @JsonIgnore
    private List<DesignElement> elements;

    @ManyToOne
    @JoinColumn(name = "ticket_design_id")
    @JsonIgnore
    private TicketDesign ticketDesign;

    private PageType type;

    public DesignPage(List<DesignElement> elements, PageType type) {
        this.elements = elements;
        this.type = type;
    }

    public DesignPage() {
        this.elements = new ArrayList<>();
        this.type = PageType.FRONT;
    }
}
