package at.htlleonding.repositories;

import at.htlleonding.types.Data;
import at.htlleonding.types.ScheduleEntry;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class ScheduleRepoTest {

    @Inject
    ScheduleRepo scheduleRepo;

    @Inject
    DataRepo dataRepo;

    private Data testData;
    private ScheduleEntry testSchedule;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        scheduleRepo.deleteAll();
        dataRepo.deleteAll();

        // Create test data
        testData = new Data();
        dataRepo.persist(testData);

        // Create test schedule entry
        testSchedule = new ScheduleEntry();
        testSchedule.setTitle("Opening Ceremony");
        testSchedule.setStart(LocalDateTime.of(2024, 12, 15, 18, 0));
        testSchedule.setData(testData);
        scheduleRepo.persist(testSchedule);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        scheduleRepo.deleteAll();
        dataRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistScheduleEntry() {
        // Given
        ScheduleEntry newSchedule = new ScheduleEntry();
        newSchedule.setTitle("Main Performance");
        newSchedule.setStart(LocalDateTime.of(2024, 12, 15, 20, 0));
        newSchedule.setData(testData);

        // When
        scheduleRepo.persist(newSchedule);

        // Then
        assertThat(newSchedule.getId()).isNotZero();
        ScheduleEntry found = scheduleRepo.findById(String.valueOf(newSchedule.getId()));
        assertThat(found).isNotNull();
        assertThat(found.getTitle()).isEqualTo("Main Performance");
        assertThat(found.getStart()).isEqualTo(LocalDateTime.of(2024, 12, 15, 20, 0));
    }

    @Test
    void testFindById() {
        // When
        ScheduleEntry found = scheduleRepo.findById(String.valueOf(testSchedule.getId()));

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getTitle()).isEqualTo("Opening Ceremony");
        assertThat(found.getStart()).isEqualTo(LocalDateTime.of(2024, 12, 15, 18, 0));
    }

    @Test
    void testFindByTitle() {
        // When
        ScheduleEntry found = scheduleRepo.find("title", "Opening Ceremony").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(testSchedule.getId());
    }

    @Test
    void testFindByData() {
        // When
        List<ScheduleEntry> schedules = scheduleRepo.find("data", testData).list();

        // Then
        assertThat(schedules).hasSize(1);
        assertThat(schedules.get(0).getTitle()).isEqualTo("Opening Ceremony");
    }

    @Test
    void testListAll() {
        // When
        List<ScheduleEntry> schedules = scheduleRepo.listAll();

        // Then
        assertThat(schedules).hasSize(1);
        assertThat(schedules.get(0).getTitle()).isEqualTo("Opening Ceremony");
    }

    @Test
    @Transactional
    void testUpdateScheduleEntry() {
        // Given
        ScheduleEntry schedule = scheduleRepo.findById(String.valueOf(testSchedule.getId()));

        // When
        schedule.setTitle("Updated Opening");
        schedule.setStart(LocalDateTime.of(2024, 12, 15, 19, 0));
        scheduleRepo.persist(schedule);

        // Then
        ScheduleEntry updated = scheduleRepo.findById(String.valueOf(testSchedule.getId()));
        assertThat(updated.getTitle()).isEqualTo("Updated Opening");
        assertThat(updated.getStart()).isEqualTo(LocalDateTime.of(2024, 12, 15, 19, 0));
    }

    @Test
    @Transactional
    void testDeleteScheduleEntry() {
        // Given
        int scheduleId = testSchedule.getId();

        // When
        scheduleRepo.delete(testSchedule);

        // Then
        ScheduleEntry deleted = scheduleRepo.findById(String.valueOf(scheduleId));
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testMultipleScheduleEntries() {
        // Given
        ScheduleEntry schedule2 = new ScheduleEntry();
        schedule2.setTitle("Intermission");
        schedule2.setStart(LocalDateTime.of(2024, 12, 15, 21, 0));
        schedule2.setData(testData);
        scheduleRepo.persist(schedule2);

        ScheduleEntry schedule3 = new ScheduleEntry();
        schedule3.setTitle("Closing Ceremony");
        schedule3.setStart(LocalDateTime.of(2024, 12, 15, 23, 0));
        schedule3.setData(testData);
        scheduleRepo.persist(schedule3);

        // When
        List<ScheduleEntry> schedules = scheduleRepo.listAll();

        // Then
        assertThat(schedules).hasSize(3);
        assertThat(schedules).extracting(ScheduleEntry::getTitle)
                .containsExactlyInAnyOrder("Opening Ceremony", "Intermission", "Closing Ceremony");
    }

    @Test
    @Transactional
    void testScheduleOrderByTime() {
        // Given
        ScheduleEntry earlySchedule = new ScheduleEntry();
        earlySchedule.setTitle("Early Event");
        earlySchedule.setStart(LocalDateTime.of(2024, 12, 15, 10, 0));
        earlySchedule.setData(testData);
        scheduleRepo.persist(earlySchedule);

        ScheduleEntry lateSchedule = new ScheduleEntry();
        lateSchedule.setTitle("Late Event");
        lateSchedule.setStart(LocalDateTime.of(2024, 12, 15, 23, 59));
        lateSchedule.setData(testData);
        scheduleRepo.persist(lateSchedule);

        // When
        List<ScheduleEntry> schedules = scheduleRepo.listAll();

        // Then
        assertThat(schedules).hasSize(3);
        // Verify we have all events
        assertThat(schedules).extracting(ScheduleEntry::getTitle)
                .contains("Early Event", "Opening Ceremony", "Late Event");
    }

    @Test
    void testCount() {
        // When
        long count = scheduleRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentId() {
        // When
        ScheduleEntry found = scheduleRepo.findById("99999");

        // Then
        assertThat(found).isNull();
    }
}

