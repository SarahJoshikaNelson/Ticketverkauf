package at.htlleonding.types.dtos;

import java.util.List;
import java.util.UUID;

public record BulkMailResponseDTO(
    int totalRecipients,
    int successCount,
    int failureCount,
    List<UUID> failedOrderIds
) {
}

