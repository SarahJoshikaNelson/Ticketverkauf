package at.htlleonding;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.concurrent.ScheduledExecutorService;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class TimeOutManager {
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    
    public List<SoonDeletedSession> soonDeletedSessions = new ArrayList<>();

    public List<SoonDeletedSession> soonDeletedActiveReservations = new ArrayList<>();

    public List<SoonDeletedTicketSession> soonDeletedTicketSessions = new ArrayList<>();

    public void removeSoonDeletedSession(String sessionId) {
        soonDeletedSessions.removeIf(session -> session.sessionId().equals(sessionId));
    }

    public void removeSoonDeletedActiveReservation(String sessionId) {
        soonDeletedActiveReservations.removeIf(session -> session.sessionId().equals(sessionId));
    }

    public void removeSoonDeletedTicketSession(String connectionId) {
        soonDeletedTicketSessions.removeIf(session -> session.connectionId().equals(connectionId));
    }

    public ScheduledFuture<?> setTimeout(Runnable task, long delayMillis) {
        return scheduler.schedule(task, delayMillis, TimeUnit.MILLISECONDS);
    }

    public void clearTimeout(ScheduledFuture<?> future) {
        future.cancel(false);
    }

    public record SoonDeletedSession(String sessionId, ScheduledFuture<?> future) {
    }

    public record SoonDeletedTicketSession(String connectionId, int selectedTickets, ScheduledFuture<?> future) {
    }
}
