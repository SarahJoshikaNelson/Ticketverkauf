package at.htlleonding.repositories;

import at.htlleonding.types.Layer;
import at.htlleonding.types.Room;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class TableRepoTest {

    @Inject
    TableRepo tableRepo;

    @Inject
    RoomRepo roomRepo;

    @Inject
    LayerRepo layerRepo;

    @Inject
    SeatRepo seatRepo;

    private Room testRoom;
    private Table testTable;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        layerRepo.deleteAll();

        // Create test layer
        Layer layer = new Layer();
        layer.setName("Ground Floor");
        layer.setLevel(0);
        layer.setPicture("base64image");
        layerRepo.persist(layer);

        // Create test room
        testRoom = new Room();
        testRoom.setName("Main Hall");
        testRoom.setLayer(layer);
        testRoom.setXPosition(10);
        testRoom.setYPosition(20);
        testRoom.setXLength(100);
        testRoom.setYLength(150);
        roomRepo.persist(testRoom);

        // Create test table
        testTable = new Table();
        testTable.setName("Table-A1");
        testTable.setRoom(testRoom);
        testTable.setXPosition(5);
        testTable.setYPosition(5);
        testTable.setXLength(10);
        testTable.setYLength(10);
        testTable.setSelectable(true);
        testTable.setSeats(new ArrayList<>());
        tableRepo.persist(testTable);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        layerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistTable() {
        // Given
        Table newTable = new Table();
        newTable.setName("Table-B1");
        newTable.setRoom(testRoom);
        newTable.setXPosition(20);
        newTable.setYPosition(30);
        newTable.setXLength(8);
        newTable.setYLength(8);
        newTable.setSelectable(true);

        // When
        tableRepo.persist(newTable);

        // Then
        Table found = tableRepo.findById("Table-B1");
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Table-B1");
        assertThat(found.getRoom().getName()).isEqualTo("Main Hall");
        assertThat(found.isSelectable()).isTrue();
    }

    @Test
    void testFindById() {
        // When
        Table found = tableRepo.findById("Table-A1");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Table-A1");
        assertThat(found.getXPosition()).isEqualTo(5);
        assertThat(found.getYPosition()).isEqualTo(5);
    }

    @Test
    void testFindByRoom() {
        // When
        List<Table> tables = tableRepo.find("room", testRoom).list();

        // Then
        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).getName()).isEqualTo("Table-A1");
    }

    @Test
    void testListAll() {
        // When
        List<Table> tables = tableRepo.listAll();

        // Then
        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).getName()).isEqualTo("Table-A1");
    }

    @Test
    @Transactional
    void testUpdateTable() {
        // Given
        Table table = tableRepo.findById("Table-A1");

        // When
        table.setXPosition(15);
        table.setYPosition(25);
        table.setSelectable(false);
        tableRepo.persist(table);

        // Then
        Table updated = tableRepo.findById("Table-A1");
        assertThat(updated.getXPosition()).isEqualTo(15);
        assertThat(updated.getYPosition()).isEqualTo(25);
        assertThat(updated.isSelectable()).isFalse();
    }

    @Test
    @Transactional
    void testDeleteTable() {
        // Given
        String tableName = testTable.getName();

        // When
        tableRepo.delete(testTable);

        // Then
        Table deleted = tableRepo.findById(tableName);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testSelectableTable() {
        // Given
        Table selectableTable = new Table();
        selectableTable.setName("Table-Selectable");
        selectableTable.setRoom(testRoom);
        selectableTable.setXPosition(30);
        selectableTable.setYPosition(30);
        selectableTable.setXLength(10);
        selectableTable.setYLength(10);
        selectableTable.setSelectable(true);
        tableRepo.persist(selectableTable);

        Table nonSelectableTable = new Table();
        nonSelectableTable.setName("Table-NonSelectable");
        nonSelectableTable.setRoom(testRoom);
        nonSelectableTable.setXPosition(40);
        nonSelectableTable.setYPosition(40);
        nonSelectableTable.setXLength(10);
        nonSelectableTable.setYLength(10);
        nonSelectableTable.setSelectable(false);
        tableRepo.persist(nonSelectableTable);

        // When
        List<Table> selectableTables = tableRepo.find("selectable", true).list();

        // Then
        assertThat(selectableTables).hasSize(2);
        assertThat(selectableTables).extracting(Table::getName)
                .contains("Table-A1", "Table-Selectable")
                .doesNotContain("Table-NonSelectable");
    }

    @Test
    @Transactional
    void testMultipleTablesInRoom() {
        // Given
        for (int i = 1; i <= 5; i++) {
            Table table = new Table();
            table.setName("Table-" + i);
            table.setRoom(testRoom);
            table.setXPosition(i * 10);
            table.setYPosition(i * 10);
            table.setXLength(8);
            table.setYLength(8);
            table.setSelectable(true);
            tableRepo.persist(table);
        }

        // When
        List<Table> tables = tableRepo.find("room", testRoom).list();

        // Then
        assertThat(tables).hasSize(6); // 5 new + 1 from setUp
    }

    @Test
    void testCount() {
        // When
        long count = tableRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    @Transactional
    void testTableToJson() {
        // When
        String json = testTable.toJson();

        // Then
        assertThat(json).isNotNull();
        assertThat(json).contains("Table-A1");
        assertThat(json).contains("xposition");
        assertThat(json).contains("yposition");
    }

    @Test
    @Transactional
    void testTableFromJson() {
        // Given
        String json = testTable.toJson();

        // When
        Table fromJson = Table.fromJson(json);

        // Then
        assertThat(fromJson).isNotNull();
        assertThat(fromJson.getName()).isEqualTo("Table-A1");
    }

    @Test
    void testTableToString() {
        // When
        String str = testTable.toString();

        // Then
        assertThat(str).contains("Table-A1");
    }
}

