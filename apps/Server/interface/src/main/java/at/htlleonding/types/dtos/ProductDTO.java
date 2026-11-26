package at.htlleonding.types.dtos;

public record ProductDTO(
        Long id,
        String title,
        String description,
        String imageUrl,
        int stock,
        double price
) {}
