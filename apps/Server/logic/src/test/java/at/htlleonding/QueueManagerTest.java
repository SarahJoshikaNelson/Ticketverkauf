package at.htlleonding;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class QueueManagerTest {

    @Inject
    QueueManager queueManager;

    @InjectMock
    SettingManager settingManager;

    @BeforeEach
    void setUp() {
        // Mock SettingManager responses
        when(settingManager.getQueueSize()).thenReturn(50);
        when(settingManager.getReservationDuration()).thenReturn(15);
        when(settingManager.getConfirmationDuration()).thenReturn(30);
    }

    @Test
    void testGetQueueSize() {
        // When
        int queueSize = queueManager.getQueueSize();

        // Then
        assertThat(queueSize).isEqualTo(50);
    }

    @Test
    void testSetQueueSize() {
        // Given
        when(settingManager.getQueueSize()).thenReturn(100);

        // When
        queueManager.setQueueSize(100);
        int queueSize = queueManager.getQueueSize();

        // Then
        assertThat(queueSize).isEqualTo(100);
    }

    @Test
    void testGetReservationDuration() {
        // When
        int duration = queueManager.getReservationDuration();

        // Then
        assertThat(duration).isEqualTo(15);
    }

    @Test
    void testSetReservationDuration() {
        // Given
        when(settingManager.getReservationDuration()).thenReturn(20);

        // When
        queueManager.setReservationDuration(20);
        int duration = queueManager.getReservationDuration();

        // Then
        assertThat(duration).isEqualTo(20);
    }

    @Test
    void testGetConfirmationDuration() {
        // When
        int duration = queueManager.getConfirmationDuration();

        // Then
        assertThat(duration).isEqualTo(30);
    }

    @Test
    void testSetConfirmationDuration() {
        // Given
        when(settingManager.getConfirmationDuration()).thenReturn(45);

        // When
        queueManager.setConfirmationDuration(45);
        int duration = queueManager.getConfirmationDuration();

        // Then
        assertThat(duration).isEqualTo(45);
    }

    @Test
    void testMultipleSettings() {
        // Given
        when(settingManager.getQueueSize()).thenReturn(75);
        when(settingManager.getReservationDuration()).thenReturn(10);
        when(settingManager.getConfirmationDuration()).thenReturn(25);

        // When
        int queueSize = queueManager.getQueueSize();
        int reservationDuration = queueManager.getReservationDuration();
        int confirmationDuration = queueManager.getConfirmationDuration();

        // Then
        assertThat(queueSize).isEqualTo(75);
        assertThat(reservationDuration).isEqualTo(10);
        assertThat(confirmationDuration).isEqualTo(25);
    }
}

