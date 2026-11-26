package at.htlleonding.types.dtos;

import java.util.List;

public record RoomDTO(
        String name,
        List<TableDTO> tables
) {
}
