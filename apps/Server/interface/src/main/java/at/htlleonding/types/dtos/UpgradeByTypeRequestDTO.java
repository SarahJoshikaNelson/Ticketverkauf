package at.htlleonding.types.dtos;

/**
 * Request to upgrade a number of digital tickets of a given type (no specific ticket IDs).
 */
public record UpgradeByTypeRequestDTO(
        String ticketType,
        int quantity
) {}
