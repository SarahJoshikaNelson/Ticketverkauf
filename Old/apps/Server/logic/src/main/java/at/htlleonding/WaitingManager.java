package at.htlleonding;

import at.htlleonding.types.dtos.ActiveReservationEntry;
import at.htlleonding.types.dtos.WaitingListEntry;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
@NoArgsConstructor
public class WaitingManager {
    private SettingManager settingManager;
    private TimeOutManager timeOutManager;

    private final List<WaitingListEntry> waitingList = new ArrayList<>();
    private final List<ActiveReservationEntry> activeReservations = new ArrayList<>();
    private final List<WaitingListObserver> observers = new CopyOnWriteArrayList<>();

    private static final Logger log = LoggerFactory.getLogger(WaitingManager.class);

    @Inject
    public WaitingManager(SettingManager settingManager, TimeOutManager timeOutManager) {
        this.settingManager = settingManager;
        this.timeOutManager = timeOutManager;
    }

    public int getWaitingSize() {
        return settingManager.getQueueSize();
    }
    
    public void addObserver(WaitingListObserver observer) {
        observers.add(observer);
    }
    
    public void removeObserver(WaitingListObserver observer) {
        observers.remove(observer);
    }

    public boolean isInActiveReservations(String sessionId) {
        activeReservations.forEach(entry -> log.info("Entry (Is in active reservations): {}", entry.sessionId()));
        return activeReservations.stream().anyMatch(entry -> entry.sessionId().equals(sessionId));
    }
    
    private void notifyWaitingListChanged() {
        List<WaitingListEntry> waitingListCopy = new ArrayList<>(waitingList);
        for (WaitingListObserver observer : observers) {
            try {
                observer.onWaitingListChanged(waitingListCopy);
            } catch (Exception e) {
                log.error("Error notifying observer: {}", e.getMessage());
            }
        }
    }
    
    private void notifyActiveReservationsChanged() {
        List<ActiveReservationEntry> activeReservationsCopy = new ArrayList<>(activeReservations);
        for (WaitingListObserver observer : observers) {
            try {
                observer.onActiveReservationsChanged(activeReservationsCopy);
            } catch (Exception e) {
                log.error("Error notifying observer: {}", e.getMessage());
            }
        }
    }

    public String addWaiting(String sessionId) {
        waitingList.add(new WaitingListEntry(sessionId));
        notifyWaitingListChanged();
        return sessionId;
    }

    public void removeActiveReservation(String sessionId) {
        boolean removed = activeReservations.removeIf(entry -> entry.sessionId().equals(sessionId));
        if (removed) {
            notifyActiveReservationsChanged();
        }
    }

    public void removeWaiting(String sessionId) {
        boolean removed = waitingList.removeIf(entry -> entry.sessionId().equals(sessionId));
        if (removed) {
            notifyWaitingListChanged();
        }
    }

    public int getCurrentlyWaiting() {
        return waitingList.size();
    }

    public boolean isInWaitingList(String sessionId) {
        return waitingList.stream().anyMatch(entry -> entry.sessionId().equals(sessionId));
    }

    public boolean mayPass(String sessionId) {
        if (activeReservations.stream().anyMatch(entry -> entry.sessionId().equals(sessionId))) {
            return true;
        }

        var maxActiveReservations = settingManager.getQueueSize();
        var reservationDuration = settingManager.getReservationDuration() * 1000 * 60;
        if (reservationDuration == 0) {
            return true;
        }

        var difference = maxActiveReservations - activeReservations.size();

        if (inFrontOfSessionHolder(sessionId) == -1) {
            return false;
        }

        if (difference > inFrontOfSessionHolder(sessionId)){
            activeReservations.add(new ActiveReservationEntry(sessionId, timeOutManager.setTimeout(new Runnable() {
                @Override
                public void run() {
                    boolean activeRemoved = activeReservations.removeIf(entry -> entry.sessionId().equals(sessionId));
                    boolean waitingRemoved = waitingList.removeIf(entry -> entry.sessionId().equals(sessionId));

                    if (activeRemoved) {
                        notifyActiveReservationsChanged();
                    }
                    if (waitingRemoved) {
                        notifyWaitingListChanged();
                    }
                }
            }, reservationDuration)));
            notifyActiveReservationsChanged();

            boolean waitingRemoved = waitingList.removeIf(entry -> entry.sessionId().equals(sessionId));
            if (waitingRemoved) {
                notifyWaitingListChanged();
            }
            return true;
        }

        return false;
    }

    public int inFrontOfSessionHolder(String sessionId) {
        return waitingList.indexOf(new WaitingListEntry(sessionId));
    }
}
