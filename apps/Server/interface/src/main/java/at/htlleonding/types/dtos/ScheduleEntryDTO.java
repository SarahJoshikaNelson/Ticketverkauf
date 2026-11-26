package at.htlleonding.types.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ScheduleEntryDTO {
    private String title;
    private LocalDateTime start;
}