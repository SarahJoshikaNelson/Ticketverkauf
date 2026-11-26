package at.htlleonding.types.dtos;

import java.nio.file.Path;

/**
 * DTO for handling exactly one uploaded PDF file for bank statement processing.
 */
public record BankProcessDTO(
        String fileName,
        Path filePath
) {
}
