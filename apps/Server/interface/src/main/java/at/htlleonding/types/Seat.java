package at.htlleonding.types;

import at.htlleonding.types.dtos.SeatDTO;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.json.bind.annotation.JsonbProperty;
import io.quarkus.hibernate.orm.JsonFormat;
import jakarta.json.bind.annotation.JsonbTransient;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonFormat
public class Seat extends PanacheEntityBase implements Serializable {
  @Id
  private UUID id;

  private double price;

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

  @ManyToOne(fetch = FetchType.EAGER)
  @JsonBackReference
  @JsonbTransient
  private Table table;

  @ManyToOne(fetch = FetchType.EAGER)
  @JsonIgnore
  @JsonbTransient
  private Order order;

  public Seat(SeatDTO dto) {
    this.id = dto.id();
    this.price = dto.price();
    this.xPosition = dto.xPosition();
    this.yPosition = dto.yPosition();
    this.xLength = dto.xLength();
    this.yLength = dto.yLength();
    // Note: taken field is derived from order relationship, not stored directly
  }

  public double calcPrice() {
    return this.price;
  }
  
  public boolean isTaken() {
    return this.order != null;
  }
  
  // Methods for template compatibility - accessing table properties through seat
  @JsonIgnore
  public String getTableName() {
    return this.table != null ? this.table.getName() : "";
  }
  
  @JsonIgnore
  public List<Seat> getSeats() {
    return this.table != null ? this.table.getSeats() : List.of();
  }
  
  @JsonIgnore
  public Room getRoom() {
    return this.table != null ? this.table.getRoom() : null;
  }
  
  @JsonIgnore
  public Table getTable() {
    return this.table;
  }
}
