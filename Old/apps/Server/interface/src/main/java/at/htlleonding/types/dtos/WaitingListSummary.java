package at.htlleonding.types.dtos;

public record WaitingListSummary(
        int currentlyWaiting,
        int inFrontOfSessionHolder,
        String sessionId,
        boolean isNew
) {
}
