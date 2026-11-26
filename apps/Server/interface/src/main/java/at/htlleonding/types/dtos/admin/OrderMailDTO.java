package at.htlleonding.types.dtos.admin;

import at.htlleonding.types.dtos.CustomerDTO;
import at.htlleonding.types.dtos.DataDTO;

import java.util.UUID;

/**
 * DTO for sending order information via email.
 * Includes event data (DataDTO) without images to keep email payload small.
 */
public record OrderMailDTO(
        UUID id,
        CustomerDTO customer,
        OrderDTO order,
        DataDTO data,
        Long invoiceNumber
) {
}
