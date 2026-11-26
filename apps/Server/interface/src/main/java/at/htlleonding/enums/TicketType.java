package at.htlleonding.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@AllArgsConstructor
public enum TicketType {
    STUDENT(24), EXTERNAL(26), GRADUATE(0);

    @Setter
    private double price;
}
