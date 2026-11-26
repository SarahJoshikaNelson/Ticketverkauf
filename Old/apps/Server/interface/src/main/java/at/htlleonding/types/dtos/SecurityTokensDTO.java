package at.htlleonding.types.dtos;

public record SecurityTokensDTO(
        String accessToken,
        String refreshToken
) {
}

