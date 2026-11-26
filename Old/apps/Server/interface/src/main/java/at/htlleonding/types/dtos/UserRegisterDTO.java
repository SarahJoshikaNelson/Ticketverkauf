package at.htlleonding.types.dtos;

public record UserRegisterDTO(
        String username,
        String email,
        String password
) {
}
