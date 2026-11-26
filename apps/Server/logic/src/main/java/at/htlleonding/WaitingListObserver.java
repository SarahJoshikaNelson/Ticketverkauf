package at.htlleonding;

import at.htlleonding.types.dtos.ActiveReservationEntry;
import at.htlleonding.types.dtos.WaitingListEntry;

import java.util.List;

/**
 * Observer interface for monitoring changes to waiting lists and active reservations
 */
public interface WaitingListObserver {
    /**
     * Called when the waiting list changes
     * @param waitingList the current waiting list
     */
    void onWaitingListChanged(List<WaitingListEntry> waitingList);
    
    /**
     * Called when active reservations change
     * @param activeReservations the current active reservations list
     */
    void onActiveReservationsChanged(List<ActiveReservationEntry> activeReservations);
}
