package at.htlleonding.types.dtos.admin;

import at.htlleonding.types.dtos.ScheduleEntryDTO;

import java.util.List;

public record ScheduleEntryRequestDTO(
        List<ScheduleEntryDTO> schedules
) {
}
