package at.htlleonding;

import at.htlleonding.types.Seat;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class SelectedSeatManager {

    // Maps connectionId to (Seat, selectionTime)
    private final Map<String, Map<Seat, Long>> userSelectedSeats = new ConcurrentHashMap<>();
    private final Object lock = new Object();

    public void selectSeats(String connectionId, List<Seat> seatsToSelect) {
        Map<Seat, Long> selected = userSelectedSeats.computeIfAbsent(connectionId, k -> new ConcurrentHashMap<>());
        long now = Instant.now().toEpochMilli();
        
        for (Seat seat : seatsToSelect) {
            synchronized (lock) {
                if (seat.getOrder() == null) {
                    selected.put(seat, now);
                }
            }
        }
    }

    public void unselectSeats(String connectionId) {
        userSelectedSeats.remove(connectionId);
    }
    
    public void unselectSeats(String connectionId, List<Seat> seatsToUnselect) {
        Map<Seat, Long> selected = userSelectedSeats.get(connectionId);
        if (selected != null) {
            for (Seat seatToUnselect : seatsToUnselect) {
                // Find the seat in the map by ID since Seat objects might be different instances
                selected.entrySet().removeIf(entry -> 
                    entry.getKey().getId().equals(seatToUnselect.getId())
                );
            }
            // Remove the user mapping if no seats are selected
            if (selected.isEmpty()) {
                userSelectedSeats.remove(connectionId);
            }
        }
    }
    
    public boolean hasUserSelectedSeats(String connectionId, List<Seat> seats) {
        Map<Seat, Long> selected = userSelectedSeats.get(connectionId);
        if (selected == null) {
            return false;
        }
        
        for (Seat seatToCheck : seats) {
            if (!selected.containsKey(seatToCheck)) {
                return false;
            }
        }
        
        return true;
    }
    
    public void clearSelectionsForUser(String connectionId) {
        unselectSeats(connectionId);
    }

    public Set<Seat> getAllSelectedSeats() {
        Set<Seat> allSelected = new HashSet<>();
        for (Map<Seat, Long> seatMap : userSelectedSeats.values()) {
            allSelected.addAll(seatMap.keySet());
        }
        return allSelected;
    }

    public void releaseExpiredSeats(Duration duration) {
        long now = Instant.now().toEpochMilli();
        long timeoutMillis = duration.toMillis();
        for (Map<Seat, Long> seatMap : userSelectedSeats.values()) {
            Iterator<Map.Entry<Seat, Long>> it = seatMap.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<Seat, Long> entry = it.next();
                if (now - entry.getValue() > timeoutMillis) {
                    it.remove();
                }
            }
        }
    }

}