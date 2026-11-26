package at.htlleonding.types.dtos;

public record OrderDTO(
        String id,
        CustomerDTO customer,
        OrderContentDTO order
) {
}
