package at.htlleonding.types;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Getter
@Setter
public class Data {
    @Id
    @GeneratedValue
    private Integer id;

    private String title;

    private String subTitle;
    private LocalDate onDate;

    private String paymentInfo;

    private String paymentText;

    private String physicalPickupInfo;

    // Footer configuration
    private String organizationName;

    private String organizationAddress;

    private String footerText;

    private String contactEmail;

    private String contactPhone;

    private String contactWebsite;

    // Images stored as base64 encoded strings
    @ElementCollection
    @CollectionTable(name = "image_data", joinColumns = @JoinColumn(name = "data_id"))
    @Column(name = "image", columnDefinition = "TEXT")
    private List<String> images;

    @OneToMany(mappedBy = "data")
    private List<ScheduleEntry> schedule;

    private String gifUrl;
}
