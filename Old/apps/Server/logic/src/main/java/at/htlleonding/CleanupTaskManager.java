package at.htlleonding;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Duration;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class CleanupTaskManager {
  private SettingManager settingManager;
  private SelectedSeatManager selectedSeatManager;
  private OrderManager orderManager;

  @Scheduled(every = "10m") //m
  @Transactional
  public void cleanUp() {
    int confirmationDurationHours = settingManager.getConfirmationDuration();
    // If duration is 0, the feature is disabled - skip cleanup 
    if (confirmationDurationHours == 0) {
      return;
    }
    orderManager.removeUnconfirmedOrdersOlderThan(Duration.ofHours(confirmationDurationHours));
  }
}
