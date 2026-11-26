package at.htlleonding.types;

import at.htlleonding.types.dtos.TableDTO;
import jakarta.json.bind.annotation.JsonbTransient;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.json.bind.annotation.JsonbProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.JsonFormat;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Entity
@jakarta.persistence.Table(name = "\"table\"")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonFormat
public class Table extends PanacheEntityBase implements Serializable {
    @Id
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JsonBackReference
    @JsonbTransient
    private Room room;

    @JsonProperty("xposition")
    @JsonbProperty("xposition")
    @Column(name = "xposition")
    private int xPosition;

    @JsonProperty("yposition")
    @JsonbProperty("yposition")
    @Column(name = "yposition")
    private int yPosition;

    @JsonProperty("xlength")
    @JsonbProperty("xlength")
    @Column(name = "xlength")
    private int xLength;

    @JsonProperty("ylength")
    @JsonbProperty("ylength")
    @Column(name = "ylength")
    private int yLength;

    private boolean selectable;

    @Transient // This field is not persisted to the database
    private boolean selected;

    @OneToMany(fetch = FetchType.EAGER, cascade = CascadeType.REMOVE, mappedBy = "table")
    @JsonManagedReference
    private List<Seat> seats;

    public double calcPrice() {
        return this.seats.stream().map(Seat::calcPrice).reduce(0.0, Double::sum);
    }

    public String calcPriceFormatted() {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("de-AT"));
        return formatter.format(calcPrice());
    }

    public Table(TableDTO tableDTO) {
        this.name = tableDTO.name();
        this.room = tableDTO.room();
        this.xPosition = tableDTO.xPosition();
        this.yPosition = tableDTO.yPosition();
        this.xLength = tableDTO.xLength();
        this.selectable = tableDTO.selectable();
        this.seats = tableDTO.seats();
    }


    public String toJson() {
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public static Table fromJson(String json) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.readValue(json, Table.class);
        } catch (Exception e) {
            e.printStackTrace(); // Log the error
            return null;
        }
    }

    @Override
    public String toString() {
        return "Table{" +
                "name='" + name + '\'' +
                "}";
    }
}
