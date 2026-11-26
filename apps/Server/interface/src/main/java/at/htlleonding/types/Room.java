package at.htlleonding.types;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.json.bind.annotation.JsonbProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Room {
    @Id
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JsonBackReference
    private Layer layer;

    @OneToMany(fetch = FetchType.EAGER, mappedBy = "room")
    @JsonManagedReference
    private List<Table> tables;

    @JsonProperty("xposition")
    @JsonbProperty("xposition")
    private int xPosition;
    
    @JsonProperty("yposition")
    @JsonbProperty("yposition")
    private int yPosition;
    
    @JsonProperty("xlength")
    @JsonbProperty("xlength")
    private int xLength;
    
    @JsonProperty("ylength")
    @JsonbProperty("ylength")
    private int yLength;

    public String toJson() {
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
