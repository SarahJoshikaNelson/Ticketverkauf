package at.htlleonding.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum OrderStatus {
    ACTIVE('A'),
    CONFIRMED('C'),
    WAITING('W'),
    PAID('P'),
    DONE('D'),
    CANCELLED('X'), ;

    @Getter
    private final char key;
}