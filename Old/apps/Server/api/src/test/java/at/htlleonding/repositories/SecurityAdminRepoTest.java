package at.htlleonding.repositories;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.types.SecurityAdmin;
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
class SecurityAdminRepoTest {

    @Inject
    SecurityAdminRepo securityAdminRepo;

    private SecurityAdmin testSecurityAdmin;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        securityAdminRepo.deleteAll();

        // Create test security admin
        testSecurityAdmin = new SecurityAdmin();
        testSecurityAdmin.setUsername("admin");
        testSecurityAdmin.setPasswordHash("$2a$10$hashed_password");
        testSecurityAdmin.setPriority(AdminPriority.HIGH);
        securityAdminRepo.persist(testSecurityAdmin);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        securityAdminRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistSecurityAdmin() {
        // Given
        SecurityAdmin newAdmin = new SecurityAdmin();
        newAdmin.setUsername("superadmin");
        newAdmin.setPasswordHash("$2a$10$another_hashed_password");
        newAdmin.setPriority(AdminPriority.MEDIUM);

        // When
        securityAdminRepo.persist(newAdmin);

        // Then
        assertThat(newAdmin.getId()).isNotZero();
        SecurityAdmin found = securityAdminRepo.findById(newAdmin.getId());
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("superadmin");
        assertThat(found.getPasswordHash()).isEqualTo("$2a$10$another_hashed_password");
        assertThat(found.getPriority()).isEqualTo(AdminPriority.MEDIUM);
    }

    @Test
    void testFindById() {
        // When
        SecurityAdmin found = securityAdminRepo.findById(testSecurityAdmin.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("admin");
        assertThat(found.getPasswordHash()).isEqualTo("$2a$10$hashed_password");
        assertThat(found.getPriority()).isEqualTo(AdminPriority.HIGH);
    }

    @Test
    void testFindByUsername() {
        // When
        SecurityAdmin found = securityAdminRepo.find("username", "admin").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(testSecurityAdmin.getId());
    }

    @Test
    void testListAll() {
        // When
        List<SecurityAdmin> admins = securityAdminRepo.listAll();

        // Then
        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getUsername()).isEqualTo("admin");
    }

    @Test
    @Transactional
    void testUpdateSecurityAdmin() {
        // Given
        SecurityAdmin admin = securityAdminRepo.findById(testSecurityAdmin.getId());

        // When
        admin.setUsername("updatedadmin");
        admin.setPasswordHash("$2a$10$new_hashed_password");
        admin.setPriority(AdminPriority.LOW);
        securityAdminRepo.persist(admin);

        // Then
        SecurityAdmin updated = securityAdminRepo.findById(testSecurityAdmin.getId());
        assertThat(updated.getUsername()).isEqualTo("updatedadmin");
        assertThat(updated.getPasswordHash()).isEqualTo("$2a$10$new_hashed_password");
        assertThat(updated.getPriority()).isEqualTo(AdminPriority.LOW);
    }

    @Test
    @Transactional
    void testDeleteSecurityAdmin() {
        // Given
        int adminId = testSecurityAdmin.getId();

        // When
        securityAdminRepo.delete(testSecurityAdmin);

        // Then
        SecurityAdmin deleted = securityAdminRepo.findById(adminId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testMultipleSecurityAdmins() {
        // Given
        for (int i = 1; i <= 3; i++) {
            SecurityAdmin admin = new SecurityAdmin();
            admin.setUsername("admin" + i);
            admin.setPasswordHash("$2a$10$hash" + i);
            admin.setPriority(i == 1 ? AdminPriority.HIGH : AdminPriority.MEDIUM);
            securityAdminRepo.persist(admin);
        }

        // When
        List<SecurityAdmin> admins = securityAdminRepo.listAll();

        // Then
        assertThat(admins).hasSize(4); // 3 new + 1 from setUp
    }

    @Test
    void testCount() {
        // When
        long count = securityAdminRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentUsername() {
        // When
        SecurityAdmin found = securityAdminRepo.find("username", "nonexistent").firstResult();

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testAdminPriorities() {
        // Given
        SecurityAdmin highPriority = new SecurityAdmin();
        highPriority.setUsername("highpriority");
        highPriority.setPasswordHash("$2a$10$hash");
        highPriority.setPriority(AdminPriority.HIGH);
        securityAdminRepo.persist(highPriority);

        SecurityAdmin lowPriority = new SecurityAdmin();
        lowPriority.setUsername("lowpriority");
        lowPriority.setPasswordHash("$2a$10$hash");
        lowPriority.setPriority(AdminPriority.LOW);
        securityAdminRepo.persist(lowPriority);

        // When
        List<SecurityAdmin> highPriorityAdmins = securityAdminRepo.find("priority", AdminPriority.HIGH).list();
        List<SecurityAdmin> lowPriorityAdmins = securityAdminRepo.find("priority", AdminPriority.LOW).list();

        // Then
        assertThat(highPriorityAdmins).hasSize(2); // test admin + highPriority
        assertThat(lowPriorityAdmins).hasSize(1);
    }

    @Test
    @Transactional
    void testPasswordHashFormat() {
        // Given
        SecurityAdmin admin = new SecurityAdmin();
        admin.setUsername("bcrypttest");
        admin.setPasswordHash("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
        admin.setPriority(AdminPriority.MEDIUM);

        // When
        securityAdminRepo.persist(admin);

        // Then
        SecurityAdmin found = securityAdminRepo.findById(admin.getId());
        assertThat(found.getPasswordHash()).startsWith("$2a$");
        assertThat(found.getPasswordHash()).hasSize(60); // BCrypt standard length
    }
}
