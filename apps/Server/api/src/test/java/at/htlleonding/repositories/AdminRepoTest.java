package at.htlleonding.repositories;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.types.Admin;
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
class AdminRepoTest {

    @Inject
    AdminRepo adminRepo;

    private Admin testAdmin;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        adminRepo.deleteAll();

        // Create test admin
        testAdmin = new Admin();
        testAdmin.setId("admin1");
        testAdmin.setAdminName("John Admin");
        testAdmin.setPriority(AdminPriority.MEDIUM);
        adminRepo.persist(testAdmin);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        adminRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistAdmin() {
        // Given
        Admin newAdmin = new Admin();
        newAdmin.setId("admin2");
        newAdmin.setAdminName("Jane Admin");
        newAdmin.setPriority(AdminPriority.HIGH);

        // When
        adminRepo.persist(newAdmin);

        // Then
        Admin found = adminRepo.findById("admin2");
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("admin2");
        assertThat(found.getAdminName()).isEqualTo("Jane Admin");
        assertThat(found.getPriority()).isEqualTo(AdminPriority.HIGH);
    }

    @Test
    void testFindById() {
        // When
        Admin found = adminRepo.findById("admin1");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("admin1");
        assertThat(found.getAdminName()).isEqualTo("John Admin");
        assertThat(found.getPriority()).isEqualTo(AdminPriority.MEDIUM);
    }

    @Test
    void testFindByAdminName() {
        // When
        Admin found = adminRepo.find("adminName", "John Admin").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("admin1");
    }

    @Test
    @Transactional
    void testFindByPriority() {
        // Given
        Admin highPriorityAdmin = new Admin();
        highPriorityAdmin.setId("admin3");
        highPriorityAdmin.setAdminName("Super Admin");
        highPriorityAdmin.setPriority(AdminPriority.HIGH);
        adminRepo.persist(highPriorityAdmin);

        // When
        List<Admin> highPriorityAdmins = adminRepo.find("priority", AdminPriority.HIGH).list();

        // Then
        assertThat(highPriorityAdmins).hasSize(1);
        assertThat(highPriorityAdmins.get(0).getAdminName()).isEqualTo("Super Admin");
    }

    @Test
    void testListAll() {
        // When
        List<Admin> admins = adminRepo.listAll();

        // Then
        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getId()).isEqualTo("admin1");
    }

    @Test
    @Transactional
    void testUpdateAdmin() {
        // Given
        Admin admin = adminRepo.findById("admin1");

        // When
        admin.setAdminName("Updated Admin");
        admin.setPriority(AdminPriority.HIGH);
        adminRepo.persist(admin);

        // Then
        Admin updated = adminRepo.findById("admin1");
        assertThat(updated.getAdminName()).isEqualTo("Updated Admin");
        assertThat(updated.getPriority()).isEqualTo(AdminPriority.HIGH);
    }

    @Test
    @Transactional
    void testDeleteAdmin() {
        // Given
        String adminId = testAdmin.getId();

        // When
        adminRepo.delete(testAdmin);

        // Then
        Admin deleted = adminRepo.findById(adminId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testMultipleAdminsWithDifferentPriorities() {
        // Given
        Admin normalAdmin = new Admin();
        normalAdmin.setId("normal1");
        normalAdmin.setAdminName("Normal Admin");
        normalAdmin.setPriority(AdminPriority.MEDIUM);
        adminRepo.persist(normalAdmin);

        Admin highAdmin = new Admin();
        highAdmin.setId("high1");
        highAdmin.setAdminName("High Admin");
        highAdmin.setPriority(AdminPriority.HIGH);
        adminRepo.persist(highAdmin);

        Admin lowAdmin = new Admin();
        lowAdmin.setId("low1");
        lowAdmin.setAdminName("Low Admin");
        lowAdmin.setPriority(AdminPriority.LOW);
        adminRepo.persist(lowAdmin);

        // When
        List<Admin> allAdmins = adminRepo.listAll();

        // Then
        assertThat(allAdmins).hasSize(4); // 3 new + 1 from setUp
        assertThat(allAdmins).extracting(Admin::getPriority)
                .containsExactlyInAnyOrder(
                        AdminPriority.MEDIUM,
                        AdminPriority.MEDIUM,
                        AdminPriority.HIGH,
                        AdminPriority.LOW
                );
    }

    @Test
    void testCount() {
        // When
        long count = adminRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentId() {
        // When
        Admin found = adminRepo.findById("nonexistent");

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testAdminPriorityEnum() {
        // Given
        Admin lowPriorityAdmin = new Admin();
        lowPriorityAdmin.setId("lowpriority");
        lowPriorityAdmin.setAdminName("Low Priority Admin");
        lowPriorityAdmin.setPriority(AdminPriority.LOW);

        // When
        adminRepo.persist(lowPriorityAdmin);

        // Then
        Admin found = adminRepo.findById("lowpriority");
        assertThat(found.getPriority()).isEqualTo(AdminPriority.LOW);
    }
}

