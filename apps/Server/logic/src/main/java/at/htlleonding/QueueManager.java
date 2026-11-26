package at.htlleonding;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class QueueManager {
    private SettingManager settingManager;

    public int getQueueSize() {
        return settingManager.getQueueSize();
    }
    
    public void setQueueSize(int size) {
        settingManager.setQueueSize(size);
    }

    public int getReservationDuration() {
        return settingManager.getReservationDuration();
    }

    public void setReservationDuration(int duration) {
        settingManager.setReservationDuration(duration);
    }

    public int getConfirmationDuration() {
        return settingManager.getConfirmationDuration();
    }

    public void setConfirmationDuration(int duration) {
        settingManager.setConfirmationDuration(duration);
    }
}
