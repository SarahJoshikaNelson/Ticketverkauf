package at.htlleonding.types.dtos;

import at.htlleonding.enums.AdminPriority;

import java.io.Serializable;

public record AdminDTO(
        String id,
        String name,
        AdminPriority priority
) implements Serializable {
}