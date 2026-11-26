package at.htlleonding.types.dtos;

import java.util.List;

/**
 * Request DTO for matching bank transactions to orders.
 * Uses last name + amount as composite key.
 */
public record BankMatchRequest(
        List<TransactionMatch> transactions
) {
    public record TransactionMatch(
            String lastName,
            double amount,
            String description
    ) {}
}

