package at.htlleonding.types.dtos;

public record CustomerDTO(
        String firstName,
        String lastName,
        String mailAddress,
        String phoneNumber,
        String schoolClass,
        boolean isMale,
        String street,
        String streetNumber,
        String zipCode,
        String town
) {
}
