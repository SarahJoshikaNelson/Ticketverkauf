package at.htlleonding;

import at.htlleonding.repositories.RoomRepo;
import at.htlleonding.repositories.SeatRepo;
import at.htlleonding.repositories.TableRepo;
import at.htlleonding.types.Room;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Table;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class SeatManagerTest {

    @Inject
    SeatManager seatManager;

    @Inject
    SeatRepo seatRepo;

    @Inject
    TableRepo tableRepo;

    @Inject
    RoomRepo roomRepo;

    private Seat testSeat;
    private Table testTable;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        seatRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();

        // Create room
        Room room = new Room();
        room.setName("Test Hall");
        roomRepo.persist(room);

        // Create table
        testTable = new Table();
        testTable.setName("SeatManagerTable1");
        testTable.setRoom(room);
        testTable.setSeats(new ArrayList<>());
        tableRepo.persist(testTable);

        // Create seat
        testSeat = new Seat();
        testSeat.setId(UUID.randomUUID()); // Set ID manually for Seat
        testSeat.setTable(testTable);
        testSeat.setPrice(50.0);
        seatRepo.persist(testSeat);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        seatRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
    }

    @Test
    void testFindSeatById() {
        // When
        Seat found = seatManager.findSeatById(testSeat.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(testSeat.getId());
        assertThat(found.getPrice()).isEqualTo(50.0);
    }

    @Test
    void testFindSeatById_NonExistent() {
        // When
        Seat found = seatManager.findSeatById(java.util.UUID.randomUUID());

        // Then
        assertThat(found).isNull();
    }

    @Test
    void testUpdatePrice() {
        // When
        boolean result = seatManager.updatePrice(testSeat.getId(), 75.0);

        // Then
        assertThat(result).isTrue();
        Seat updated = seatRepo.findById(testSeat.getId());
        assertThat(updated.getPrice()).isEqualTo(75.0);
    }

    @Test
    void testUpdatePrice_MultipleUpdates() {
        // When
        seatManager.updatePrice(testSeat.getId(), 60.0);
        seatManager.updatePrice(testSeat.getId(), 70.0);
        seatManager.updatePrice(testSeat.getId(), 80.0);

        // Then
        Seat updated = seatRepo.findById(testSeat.getId());
        assertThat(updated.getPrice()).isEqualTo(80.0);
    }

    @Test
    void testUpdatePrice_ToZero() {
        // When
        boolean result = seatManager.updatePrice(testSeat.getId(), 0.0);

        // Then
        assertThat(result).isTrue();
        Seat updated = seatRepo.findById(testSeat.getId());
        assertThat(updated.getPrice()).isEqualTo(0.0);
    }
}

