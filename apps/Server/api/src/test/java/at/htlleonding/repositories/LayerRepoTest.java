package at.htlleonding.repositories;

import at.htlleonding.types.Layer;
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
class LayerRepoTest {

    @Inject
    LayerRepo layerRepo;

    @Inject
    RoomRepo roomRepo;

    private Layer testLayer;

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
        testLayer.setPicture("data:image/png;base64,iVBORw0KG...");
        testLayer.setRooms(new ArrayList<>());
        layerRepo.persist(testLayer);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        roomRepo.deleteAll();
        layerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistLayer() {
        // Given
        Layer newLayer = new Layer();
        newLayer.setName("First Floor");
        newLayer.setLevel(1);
        newLayer.setPicture("data:image/png;base64,ABC123...");

        // When
        layerRepo.persist(newLayer);

        // Then
        Layer found = layerRepo.find("name", "First Floor").firstResult();
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("First Floor");
        assertThat(found.getLevel()).isEqualTo(1);
        assertThat(found.getPicture()).isEqualTo("data:image/png;base64,ABC123...");
    }

    @Test
    void testFindById() {
        // When
        Layer found = layerRepo.find("name", "Ground Floor").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Ground Floor");
        assertThat(found.getLevel()).isEqualTo(0);
    }

    @Test
    void testFindByLevel() {
        // When
        Layer found = layerRepo.find("level", 0).firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Ground Floor");
    }

    @Test
    void testListAll() {
        // When
        List<Layer> layers = layerRepo.listAll();

        // Then
        assertThat(layers).hasSize(1);
        assertThat(layers.get(0).getName()).isEqualTo("Ground Floor");
    }

    @Test
    @Transactional
    void testUpdateLayer() {
        // Given
        Layer layer = layerRepo.find("name", "Ground Floor").firstResult();

        // When
        layer.setLevel(1);
        layer.setPicture("updated_image_data");
        layerRepo.persist(layer);

        // Then
        Layer updated = layerRepo.find("name", "Ground Floor").firstResult();
        assertThat(updated.getLevel()).isEqualTo(1);
        assertThat(updated.getPicture()).isEqualTo("updated_image_data");
    }

    @Test
    @Transactional
    void testDeleteLayer() {
        // Given
        String layerName = testLayer.getName();

        // When
        layerRepo.delete(testLayer);

        // Then
        Layer deleted = layerRepo.find("name", layerName).firstResult();
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testMultipleLayers() {
        // Given
        Layer layer1 = new Layer();
        layer1.setName("First Floor");
        layer1.setLevel(1);
        layer1.setPicture("floor1_image");
        layerRepo.persist(layer1);

        Layer layer2 = new Layer();
        layer2.setName("Second Floor");
        layer2.setLevel(2);
        layer2.setPicture("floor2_image");
        layerRepo.persist(layer2);

        Layer basement = new Layer();
        basement.setName("Basement");
        basement.setLevel(-1);
        basement.setPicture("basement_image");
        layerRepo.persist(basement);

        // When
        List<Layer> layers = layerRepo.listAll();

        // Then
        assertThat(layers).hasSize(4); // 3 new + 1 from setUp
        assertThat(layers).extracting(Layer::getName)
                .containsExactlyInAnyOrder("Ground Floor", "First Floor", "Second Floor", "Basement");
    }

    @Test
    void testCount() {
        // When
        long count = layerRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentName() {
        // When
        Layer found = layerRepo.find("name", "NonExistent").firstResult();

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testLayerToJson() {
        // When
        String json = testLayer.toJson();

        // Then
        assertThat(json).isNotNull();
        assertThat(json).contains("Ground Floor");
        assertThat(json).contains("level");
        assertThat(json).contains("picture");
    }

    @Test
    @Transactional
    void testNegativeLevelLayer() {
        // Given
        Layer basement = new Layer();
        basement.setName("Basement Level -2");
        basement.setLevel(-2);
        basement.setPicture("basement_data");

        // When
        layerRepo.persist(basement);

        // Then
        Layer found = layerRepo.find("name", "Basement Level -2").firstResult();
        assertThat(found.getLevel()).isEqualTo(-2);
    }
}

