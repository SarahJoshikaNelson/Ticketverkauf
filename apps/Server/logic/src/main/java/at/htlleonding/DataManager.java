package at.htlleonding;

import at.htlleonding.repositories.DataRepo;
import at.htlleonding.repositories.ScheduleRepo;
import at.htlleonding.types.Data;
import at.htlleonding.types.ScheduleEntry;
import at.htlleonding.types.dtos.DataDTO;
import at.htlleonding.types.dtos.ScheduleEntryDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class DataManager {
    private DataRepo dataRepo;
    private ScheduleRepo scheduleRepo;

    public Data getData() {
        return dataRepo.findById(1);
    }

    @Transactional
    public void updateData(DataDTO data) {
        Data dataEntity = dataRepo.findById(1);
        dataEntity.setTitle(data.getTitle());
        dataEntity.setSubTitle(data.getSubTitle());
        dataEntity.setOnDate(data.getDate());
        dataEntity.setPaymentInfo(data.getPaymentInfo());
        dataEntity.setPaymentText(data.getPaymentText());
        dataEntity.setPhysicalPickupInfo(data.getPhysicalPickupInfo());
        dataEntity.setGifUrl(data.getGifUrl() != null ? data.getGifUrl() : "");
        dataEntity.setOrganizationName(data.getOrganizationName());
        dataEntity.setOrganizationAddress(data.getOrganizationAddress());
        dataEntity.setFooterText(data.getFooterText());
        dataEntity.setContactEmail(data.getContactEmail());
        dataEntity.setContactPhone(data.getContactPhone());
        dataEntity.setContactWebsite(data.getContactWebsite());
        dataRepo.persist(dataEntity);
    }

    @Transactional
    public void updateImages(List<String> images) {
        Data data = dataRepo.findById(1);
        data.setImages(images);
        dataRepo.persist(data);
    }

    @Transactional
    public void updateSchedule(List<ScheduleEntryDTO> schedule) {
        Data data = dataRepo.findById(1);

        scheduleRepo.deleteAll();

        for (ScheduleEntryDTO scheduleEntryDTO : schedule) {
            ScheduleEntry scheduleEntry = new ScheduleEntry();
            scheduleEntry.setTitle(scheduleEntryDTO.getTitle());
            scheduleEntry.setStart(scheduleEntryDTO.getStart());
            scheduleEntry.setData(data);
            scheduleRepo.persist(scheduleEntry);
        }

        dataRepo.persist(data);
    }
}
