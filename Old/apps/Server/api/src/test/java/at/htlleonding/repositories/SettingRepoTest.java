package at.htlleonding.repositories;

import at.htlleonding.test.EmbeddedPostgresResource;
import at.htlleonding.types.Setting;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class SettingRepoTest {

    @Inject
    SettingRepo settingRepo;

    private Setting testSetting;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        settingRepo.deleteAll();

        // Create test setting
        testSetting = new Setting();
        testSetting.setKey("MaxTicketCount");
        testSetting.setValue(500.0);
        settingRepo.persist(testSetting);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        settingRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistSetting() {
        // Given
        Setting newSetting = new Setting();
        newSetting.setKey("StudentTicketPrice");
        newSetting.setValue(25.0);

        // When
        settingRepo.persist(newSetting);

        // Then
        Setting found = settingRepo.findById("StudentTicketPrice");
        assertThat(found).isNotNull();
        assertThat(found.getKey()).isEqualTo("StudentTicketPrice");
        assertThat(found.getValue()).isEqualTo(25.0);
    }

    @Test
    void testFindById() {
        // When
        Setting found = settingRepo.findById("MaxTicketCount");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getKey()).isEqualTo("MaxTicketCount");
        assertThat(found.getValue()).isEqualTo(500.0);
    }

    @Test
    void testListAll() {
        // When
        List<Setting> settings = settingRepo.listAll();

        // Then
        assertThat(settings).hasSize(1);
        assertThat(settings.get(0).getKey()).isEqualTo("MaxTicketCount");
    }

    @Test
    @Transactional
    void testUpdateSetting() {
        // Given
        Setting setting = settingRepo.findById("MaxTicketCount");

        // When
        setting.setValue(600.0);
        settingRepo.persist(setting);

        // Then
        Setting updated = settingRepo.findById("MaxTicketCount");
        assertThat(updated.getValue()).isEqualTo(600.0);
    }

    @Test
    @Transactional
    void testUpdateSettingWithQuery() {
        // When
        settingRepo.update("SET value = ?1 WHERE key = 'MaxTicketCount'", 750.0);

        // Then
        Setting updated = settingRepo.findById("MaxTicketCount");
        assertThat(updated.getValue()).isEqualTo(750.0);
    }

    @Test
    @Transactional
    void testDeleteSetting() {
        // Given
        String settingKey = testSetting.getKey();

        // When
        settingRepo.delete(testSetting);

        // Then
        Setting deleted = settingRepo.findById(settingKey);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testMultipleSettings() {
        // Given
        Setting setting1 = new Setting();
        setting1.setKey("ExternTicketPrice");
        setting1.setValue(35.0);
        settingRepo.persist(setting1);

        Setting setting2 = new Setting();
        setting2.setKey("PhysicalTicketAdditionalCharge");
        setting2.setValue(5.0);
        settingRepo.persist(setting2);

        Setting setting3 = new Setting();
        setting3.setKey("QueueSize");
        setting3.setValue(50.0);
        settingRepo.persist(setting3);

        // When
        List<Setting> settings = settingRepo.listAll();

        // Then
        assertThat(settings).hasSize(4); // 3 new + 1 from setUp
        assertThat(settings).extracting(Setting::getKey)
                .containsExactlyInAnyOrder(
                        "MaxTicketCount",
                        "ExternTicketPrice",
                        "PhysicalTicketAdditionalCharge",
                        "QueueSize"
                );
    }

    @Test
    @Transactional
    void testSettingWithDecimalValue() {
        // Given
        Setting setting = new Setting();
        setting.setKey("TaxRate");
        setting.setValue(19.99);

        // When
        settingRepo.persist(setting);

        // Then
        Setting found = settingRepo.findById("TaxRate");
        assertThat(found.getValue()).isEqualTo(19.99);
    }

    @Test
    @Transactional
    void testSettingWithZeroValue() {
        // Given
        Setting setting = new Setting();
        setting.setKey("DiscountRate");
        setting.setValue(0.0);

        // When
        settingRepo.persist(setting);

        // Then
        Setting found = settingRepo.findById("DiscountRate");
        assertThat(found.getValue()).isEqualTo(0.0);
    }

    @Test
    @Transactional
    void testSettingWithNegativeValue() {
        // Given
        Setting setting = new Setting();
        setting.setKey("Offset");
        setting.setValue(-10.0);

        // When
        settingRepo.persist(setting);

        // Then
        Setting found = settingRepo.findById("Offset");
        assertThat(found.getValue()).isEqualTo(-10.0);
    }

    @Test
    void testCount() {
        // When
        long count = settingRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentKey() {
        // When
        Setting found = settingRepo.findById("NonExistent");

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testCommonApplicationSettings() {
        // Given - Create common settings
        Setting reservationDuration = new Setting();
        reservationDuration.setKey("ReservationDuration");
        reservationDuration.setValue(15.0); // 15 minutes
        settingRepo.persist(reservationDuration);

        Setting confirmationDuration = new Setting();
        confirmationDuration.setKey("ConfirmationDuration");
        confirmationDuration.setValue(30.0); // 30 minutes
        settingRepo.persist(confirmationDuration);

        Setting studentPrice = new Setting();
        studentPrice.setKey("StudentTicketPrice");
        studentPrice.setValue(20.0);
        settingRepo.persist(studentPrice);

        Setting externPrice = new Setting();
        externPrice.setKey("ExternTicketPrice");
        externPrice.setValue(30.0);
        settingRepo.persist(externPrice);

        // When
        List<Setting> allSettings = settingRepo.listAll();

        // Then
        assertThat(allSettings).hasSize(5); // 4 new + 1 from setUp
    }
}

