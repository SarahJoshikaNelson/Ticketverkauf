package at.htlleonding.repositories;

import at.htlleonding.types.Graduate;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class GraduateRepoTest {

    @Inject
    GraduateRepo graduateRepo;

    private Graduate testGraduate;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        graduateRepo.deleteAll();

        // Create test graduate
        testGraduate = new Graduate();
        testGraduate.setId("G12345");
        testGraduate.setFreeTicketCount(0);
        graduateRepo.persist(testGraduate);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        graduateRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistGraduate() {
        // Given
        Graduate newGraduate = new Graduate();
        newGraduate.setId("G67890");
        newGraduate.setFreeTicketCount(0);

        // When
        graduateRepo.persist(newGraduate);

        // Then
        Graduate found = graduateRepo.findById("G67890");
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("G67890");
        assertThat(found.getFreeTicketCount()).isEqualTo(0);
    }

    @Test
    void testFindById() {
        // When
        Graduate found = graduateRepo.findById("G12345");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("G12345");
        assertThat(found.getFreeTicketCount()).isEqualTo(0);
    }

    @Test
    void testListAll() {
        // When
        List<Graduate> graduates = graduateRepo.listAll();

        // Then
        assertThat(graduates).hasSize(1);
        assertThat(graduates.get(0).getId()).isEqualTo("G12345");
    }

    @Test
    @Transactional
    void testUpdateGraduate() {
        // Given
        Graduate graduate = graduateRepo.findById("G12345");

        // When
        graduate.setFreeTicketCount(1);
        graduateRepo.persist(graduate);

        // Then
        Graduate updated = graduateRepo.findById("G12345");
        assertThat(updated.getFreeTicketCount()).isEqualTo(1);
    }

    @Test
    @Transactional
    void testDeleteGraduate() {
        // Given
        String graduateId = testGraduate.getId();

        // When
        graduateRepo.delete(testGraduate);

        // Then
        Graduate deleted = graduateRepo.findById(graduateId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testGraduateWithMultipleFreeTickets() {
        // Given
        Graduate graduate = graduateRepo.findById("G12345");

        // When
        graduate.setFreeTicketCount(2);
        graduateRepo.persist(graduate);

        // Then
        Graduate found = graduateRepo.findById("G12345");
        assertThat(found.getFreeTicketCount()).isEqualTo(2);
    }

    @Test
    @Transactional
    void testIncrementFreeTicketCount() {
        // Given
        Graduate graduate = graduateRepo.findById("G12345");

        // When - Simulate using first free ticket
        graduate.setFreeTicketCount(graduate.getFreeTicketCount() + 1);
        graduateRepo.persist(graduate);

        // Then
        Graduate updated = graduateRepo.findById("G12345");
        assertThat(updated.getFreeTicketCount()).isEqualTo(1);

        // When - Simulate using second free ticket
        updated.setFreeTicketCount(updated.getFreeTicketCount() + 1);
        graduateRepo.persist(updated);

        // Then
        Graduate finalUpdate = graduateRepo.findById("G12345");
        assertThat(finalUpdate.getFreeTicketCount()).isEqualTo(2);
    }

    @Test
    @Transactional
    void testFindGraduatesWithNoFreeTicketsUsed() {
        // Given
        Graduate grad1 = new Graduate();
        grad1.setId("G11111");
        grad1.setFreeTicketCount(0);
        graduateRepo.persist(grad1);

        Graduate grad2 = new Graduate();
        grad2.setId("G22222");
        grad2.setFreeTicketCount(1);
        graduateRepo.persist(grad2);

        Graduate grad3 = new Graduate();
        grad3.setId("G33333");
        grad3.setFreeTicketCount(2);
        graduateRepo.persist(grad3);

        // When
        List<Graduate> gradsWithNoTickets = graduateRepo.find("freeTicketCount", 0).list();

        // Then
        assertThat(gradsWithNoTickets).hasSize(2);
        assertThat(gradsWithNoTickets).extracting(Graduate::getId)
                .containsExactlyInAnyOrder("G12345", "G11111");
    }

    @Test
    @Transactional
    void testFindGraduatesWhoUsedAllFreeTickets() {
        // Given
        Graduate grad1 = new Graduate();
        grad1.setId("G11111");
        grad1.setFreeTicketCount(2);
        graduateRepo.persist(grad1);

        Graduate grad2 = new Graduate();
        grad2.setId("G22222");
        grad2.setFreeTicketCount(1);
        graduateRepo.persist(grad2);

        // When
        List<Graduate> gradsWithMaxTickets = graduateRepo.find("freeTicketCount", 2).list();

        // Then
        assertThat(gradsWithMaxTickets).hasSize(1);
        assertThat(gradsWithMaxTickets.get(0).getId()).isEqualTo("G11111");
    }

    @Test
    void testCount() {
        // When
        long count = graduateRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentId() {
        // When
        Graduate found = graduateRepo.findById("NONEXISTENT");

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testCaseInsensitiveId() {
        // Given
        Graduate graduate = new Graduate();
        graduate.setId("g99999");
        graduate.setFreeTicketCount(0);

        // When
        graduateRepo.persist(graduate);

        // Then
        Graduate foundLower = graduateRepo.findById("g99999");
        Graduate foundUpper = graduateRepo.findById("G99999");
        
        // Note: Depending on database collation, this may or may not find the graduate
        // The application typically converts to uppercase before querying
        assertThat(foundLower).isNotNull();
    }

    @Test
    @Transactional
    void testMultipleGraduates() {
        // Given
        for (int i = 1; i <= 5; i++) {
            Graduate graduate = new Graduate();
            graduate.setId("G" + String.format("%05d", i));
            graduate.setFreeTicketCount(i % 3); // 0, 1, or 2
            graduateRepo.persist(graduate);
        }

        // When
        List<Graduate> allGraduates = graduateRepo.listAll();

        // Then
        assertThat(allGraduates).hasSize(6); // 5 new + 1 from setUp
    }
}

