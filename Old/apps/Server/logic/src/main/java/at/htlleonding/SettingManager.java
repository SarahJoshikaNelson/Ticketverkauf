package at.htlleonding;

import at.htlleonding.repositories.SettingRepo;
import at.htlleonding.repositories.StringSettingRepo;
import at.htlleonding.types.Setting;
import at.htlleonding.types.StringSetting;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class SettingManager {
    private SettingRepo settingRepo;
    private StringSettingRepo stringSettingRepo;
    private static final String CONFIRMATION_TIME_STRING = "ConfirmationTime";

    public void addSetting(String key, long value) {
        Setting setting = new Setting();
        setting.setKey(key);
        setting.setValue(value);
        settingRepo.persist(setting);
    }

    public int getSettingSize() {
        return settingRepo.listAll().size();
    }

    public int getPhase() {
        return (int) settingRepo.findById("Phase").getValue();
    }

    public void setPhase(int phase) {
        Setting setting = settingRepo.findById("Phase");
        setting.setValue(phase);
        settingRepo.persist(setting);
        //TODO error handling and proper return
    }

    @Transactional
    public void removeTicket() {
        int ticketCount = (int)settingRepo.findById("BoughtTicketCount").getValue();
        settingRepo.findById("BoughtTicketCount").setValue(ticketCount - 1);
        //TODO error handling and proper return
    }

    @Transactional
    public void setQueueSize(int size) {
        settingRepo.findById("QueueStartSize").setValue(size);
        //TODO error handling and proper return
    }

    @Transactional
    public int getQueueSize() {
        return (int) settingRepo.findById("QueueStartSize").getValue();
    }

    @Transactional
    public int getReservationDuration() {
        return (int) settingRepo.findById("ReservationTime").getValue();
    }
    
    @Transactional
    public void setReservationDuration(int duration) {
        settingRepo.findById("ReservationTime").setValue(duration);
        //TODO error handling and proper return
    }

    @Transactional
    public int getConfirmationDuration() {
        Setting setting = settingRepo.findById(CONFIRMATION_TIME_STRING);
        if (setting == null) {
            // Default to 12 hours if not set
            addSetting(CONFIRMATION_TIME_STRING, 12);
            return 12;
        }
        return (int) setting.getValue();
    }
    
    @Transactional
    public boolean isStripeEnabled() {
        Setting setting = settingRepo.findById("StripeEnabled");
        if (setting == null) {
            return false;
        }
        return (int) setting.getValue() == 1;
    }

    @Transactional
    public void setStripeEnabled(boolean enabled) {
        Setting setting = settingRepo.findById("StripeEnabled");
        if (setting == null) {
            addSetting("StripeEnabled", enabled ? 1 : 0);
        } else {
            setting.setValue(enabled ? 1 : 0);
            settingRepo.persist(setting);
        }
    }

    @Transactional
    public void setConfirmationDuration(int duration) {
        Setting setting = settingRepo.findById(CONFIRMATION_TIME_STRING);
        if (setting == null) {
            addSetting(CONFIRMATION_TIME_STRING, duration);
        } else {
            setting.setValue(duration);
            settingRepo.persist(setting);
        }
        //TODO error handling and proper return
    }

    @Transactional
    public String getStripeSecretKey() {
        StringSetting setting = stringSettingRepo.findById("StripeSecretKey");
        return setting != null ? setting.getValue() : null;
    }

    @Transactional
    public void setStripeSecretKey(String key) {
        StringSetting setting = stringSettingRepo.findById("StripeSecretKey");
        if (setting == null) {
            setting = new StringSetting();
            setting.setKey("StripeSecretKey");
        }
        setting.setValue(key);
        stringSettingRepo.persist(setting);
    }

    @Transactional
    public String getStripeWebhookSecret() {
        StringSetting setting = stringSettingRepo.findById("StripeWebhookSecret");
        return setting != null ? setting.getValue() : null;
    }

    @Transactional
    public void setStripeWebhookSecret(String secret) {
        StringSetting setting = stringSettingRepo.findById("StripeWebhookSecret");
        if (setting == null) {
            setting = new StringSetting();
            setting.setKey("StripeWebhookSecret");
        }
        setting.setValue(secret);
        stringSettingRepo.persist(setting);
    }
}
