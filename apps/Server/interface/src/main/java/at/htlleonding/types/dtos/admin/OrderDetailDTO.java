package at.htlleonding.types.dtos.admin;

import at.htlleonding.types.dtos.CustomerDTO;

import java.util.UUID;

public record OrderDetailDTO(
        UUID id,
        CustomerDTO customer,
        OrderDTO order,
        Long invoiceNumber
) {
}
