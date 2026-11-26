package at.htlleonding.repositories;

import at.htlleonding.types.User;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class UserRepoTest {

    @Inject
    UserRepo userRepo;

    private User testUser;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up any existing test data
        userRepo.deleteAll();
        
        // Create a test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setMailAddress("test@example.com");
        testUser.setPasswordHash("hashed_password");
        userRepo.persist(testUser);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        userRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistUser() {
        // Given
        User newUser = new User();
        newUser.setUsername("newuser");
        newUser.setMailAddress("newuser@example.com");
        newUser.setPasswordHash("password_hash");

        // When
        userRepo.persist(newUser);

        // Then
        assertThat(newUser.getId()).isNotNull();
        User found = userRepo.find("id", newUser.getId()).firstResult();
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("newuser");
        assertThat(found.getMailAddress()).isEqualTo("newuser@example.com");
    }

    @Test
    void testFindById() {
        // When
        User found = userRepo.find("id", testUser.getId()).firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("testuser");
        assertThat(found.getMailAddress()).isEqualTo("test@example.com");
    }

    @Test
    void testFindByEmail() {
        // When
        User found = userRepo.find("mailAddress", "test@example.com").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("testuser");
    }

    @Test
    void testFindByUsername() {
        // When
        User found = userRepo.find("username", "testuser").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getMailAddress()).isEqualTo("test@example.com");
    }

    @Test
    void testListAll() {
        // Given - testUser already exists from setUp

        // When
        List<User> users = userRepo.listAll();

        // Then
        assertThat(users).isNotEmpty();
        assertThat(users).hasSize(1);
        assertThat(users.get(0).getUsername()).isEqualTo("testuser");
    }

    @Test
    @Transactional
    void testUpdateUser() {
        // Given
        User user = userRepo.find("id", testUser.getId()).firstResult();

        // When
        user.setUsername("updateduser");
        userRepo.persist(user);

        // Then
        User updated = userRepo.find("id", testUser.getId()).firstResult();
        assertThat(updated.getUsername()).isEqualTo("updateduser");
    }

    @Test
    @Transactional
    void testDeleteUser() {
        // Given
        UUID userId = testUser.getId();

        // When
        userRepo.delete(testUser);

        // Then
        User deleted = userRepo.find("id", userId).firstResult();
        assertThat(deleted).isNull();
    }

    @Test
    void testCount() {
        // When
        long count = userRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentEmail() {
        // When
        User found = userRepo.find("mailAddress", "nonexistent@example.com").firstResult();

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testPersistMultipleUsers() {
        // Given
        User user2 = new User();
        user2.setUsername("user2");
        user2.setMailAddress("user2@example.com");
        user2.setPasswordHash("hash2");

        User user3 = new User();
        user3.setUsername("user3");
        user3.setMailAddress("user3@example.com");
        user3.setPasswordHash("hash3");

        // When
        userRepo.persist(user2);
        userRepo.persist(user3);

        // Then
        assertThat(userRepo.count()).isEqualTo(3);
    }
}

