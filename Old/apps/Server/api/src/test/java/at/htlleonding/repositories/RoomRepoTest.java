package at.htlleonding.repositories;

import at.htlleonding.types.Layer;
import at.htlleonding.types.Room;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class RoomRepoTest {

    @Inject
    RoomRepo roomRepo;

    @Inject
    LayerRepo layerRepo;

    @Inject
    TableRepo tableRepo;

    private Layer testLayer;
    private Room testRoom;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        roomRepo.deleteAll();
        layerRepo.deleteAll();

        // Create test layer
        testLayer = new Layer();
        testLayer.setName("Ground Floor");
        testLayer.setLevel(0);
        testLayer.setPicture("base64image");
        layerRepo.persist(testLayer);

        // Create test room
        testRoom = new Room();
        testRoom.setName("Main Hall");
        testRoom.setLayer(testLayer);
        testRoom.setXPosition(10);
        testRoom.setYPosition(20);
        testRoom.setXLength(100);
        testRoom.setYLength(150);
        testRoom.setTables(new ArrayList<>());
        roomRepo.persist(testRoom);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        roomRepo.deleteAll();
        layerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistRoom() {
        // Given
        Room newRoom = new Room();
        newRoom.setName("VIP Lounge");
        newRoom.setLayer(testLayer);
        newRoom.setXPosition(200);
        newRoom.setYPosition(300);
        newRoom.setXLength(80);
        newRoom.setYLength(60);

        // When
        roomRepo.persist(newRoom);

        // Then
        Room found = roomRepo.findById("VIP Lounge");
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("VIP Lounge");
        assertThat(found.getLayer().getName()).isEqualTo("Ground Floor");
        assertThat(found.getXPosition()).isEqualTo(200);
        assertThat(found.getYPosition()).isEqualTo(300);
    }

    @Test
    void testFindById() {
        // When
        Room found = roomRepo.findById("Main Hall");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Main Hall");
        assertThat(found.getXPosition()).isEqualTo(10);
        assertThat(found.getYPosition()).isEqualTo(20);
    }

    @Test
    void testFindByLayer() {
        // When
        List<Room> rooms = roomRepo.find("layer", testLayer).list();

        // Then
        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0).getName()).isEqualTo("Main Hall");
    }

    @Test
    void testListAll() {
        // When
        List<Room> rooms = roomRepo.listAll();

        // Then
        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0).getName()).isEqualTo("Main Hall");
    }

    @Test
    @Transactional
    void testUpdateRoom() {
        // Given
        Room room = roomRepo.findById("Main Hall");

        // When
        room.setXPosition(50);
        room.setYPosition(80);
        room.setXLength(120);
        room.setYLength(180);
        roomRepo.persist(room);

        // Then
        Room updated = roomRepo.findById("Main Hall");
        assertThat(updated.getXPosition()).isEqualTo(50);
        assertThat(updated.getYPosition()).isEqualTo(80);
        assertThat(updated.getXLength()).isEqualTo(120);
        assertThat(updated.getYLength()).isEqualTo(180);
    }

    @Test
    @Transactional
    void testDeleteRoom() {
        // Given
        String roomName = testRoom.getName();

        // When
        roomRepo.delete(testRoom);

        // Then
        Room deleted = roomRepo.findById(roomName);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testRoomPosition() {
        // Given
        Room room = new Room();
        room.setName("Corner Room");
        room.setLayer(testLayer);
        room.setXPosition(0);
        room.setYPosition(0);
        room.setXLength(50);
        room.setYLength(50);

        // When
        roomRepo.persist(room);

        // Then
        Room found = roomRepo.findById("Corner Room");
        assertThat(found.getXPosition()).isEqualTo(0);
        assertThat(found.getYPosition()).isEqualTo(0);
    }

    @Test
    @Transactional
    void testMultipleRoomsInSameLayer() {
        // Given
        Room room2 = new Room();
        room2.setName("Side Hall");
        room2.setLayer(testLayer);
        room2.setXPosition(150);
        room2.setYPosition(200);
        room2.setXLength(80);
        room2.setYLength(100);

        Room room3 = new Room();
        room3.setName("Back Hall");
        room3.setLayer(testLayer);
        room3.setXPosition(250);
        room3.setYPosition(300);
        room3.setXLength(60);
        room3.setYLength(80);

        // When
        roomRepo.persist(room2);
        roomRepo.persist(room3);

        // Then
        List<Room> rooms = roomRepo.find("layer", testLayer).list();
        assertThat(rooms).hasSize(3);
        assertThat(rooms).extracting(Room::getName)
                .containsExactlyInAnyOrder("Main Hall", "Side Hall", "Back Hall");
    }

    @Test
    void testCount() {
        // When
        long count = roomRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentName() {
        // When
        Room found = roomRepo.findById("NonExistent");

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testRoomToJson() {
        // When
        String json = testRoom.toJson();

        // Then
        assertThat(json).isNotNull();
        assertThat(json).contains("Main Hall");
        assertThat(json).contains("xposition");
        assertThat(json).contains("yposition");
    }
}

