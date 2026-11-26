package at.htlleonding;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.repositories.SecurityAdminRepo;
import at.htlleonding.repositories.UserRepo;
import at.htlleonding.types.SecurityAdmin;
import at.htlleonding.types.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class UserManagerTest {

    @Inject
    UserManager userManager;

    @Inject
    UserRepo userRepo;

    @Inject
    SecurityAdminRepo securityAdminRepo;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        userRepo.deleteAll();
        securityAdminRepo.deleteAll();
    }

    @AfterEach
    @Transactional
    void tearDown() {
        userRepo.deleteAll();
        securityAdminRepo.deleteAll();
    }

    @Test
    void testGetOrCreateUser_CreatesNewUser() {
        // When
        User user = userManager.getOrCreateUser("testuser", "test@example.com");

        // Then
        assertThat(user).isNotNull();
        assertThat(user.getId()).isNotNull();
        assertThat(user.getUsername()).isEqualTo("testuser");
        assertThat(user.getMailAddress()).isEqualTo("test@example.com");
        assertThat(user.getPasswordHash()).isNull();
    }

    @Test
    void testGetOrCreateUser_ReturnsExistingUser() {
        // Given
        User existingUser = userManager.getOrCreateUser("existing", "existing@example.com");

        // When
        User retrieved = userManager.getOrCreateUser("newname", "existing@example.com");

        // Then
        assertThat(retrieved.getId()).isEqualTo(existingUser.getId());
        assertThat(retrieved.getUsername()).isEqualTo("existing"); // Original username preserved
    }

    @Test
    void testGetOrCreateUser_WithPassword() {
        // When
        User user = userManager.getOrCreateUser("testuser", "test@example.com", "mypassword");

        // Then
        assertThat(user).isNotNull();
        assertThat(user.getPasswordHash()).isNotNull();
        assertThat(BcryptUtil.matches("mypassword", user.getPasswordHash())).isTrue();
    }

    @Test
    void testCreateSecurityAdmin() {
        // When
        userManager.createSecurityAdmin("admin", "adminpass", AdminPriority.HIGH);

        // Then
        SecurityAdmin admin = securityAdminRepo.find("username", "admin").firstResult();
        assertThat(admin).isNotNull();
        assertThat(admin.getUsername()).isEqualTo("admin");
        assertThat(admin.getPriority()).isEqualTo(AdminPriority.HIGH);
        assertThat(admin.getPasswordHash()).isNotNull();
    }

    @Test
    void testGetSecurityAdminPriority() {
        // Given
        userManager.createSecurityAdmin("admin", "adminpass", AdminPriority.MEDIUM);

        // When
        AdminPriority priority = userManager.getSecurityAdminPriority("admin");

        // Then
        assertThat(priority).isEqualTo(AdminPriority.MEDIUM);
    }

    @Test
    void testGetSecurityAdminPriority_NonExistent() {
        // When
        AdminPriority priority = userManager.getSecurityAdminPriority("nonexistent");

        // Then
        assertThat(priority).isNull();
    }

    @Test
    void testIsAuthenticated_ValidCredentials() {
        // Given
        userManager.createSecurityAdmin("admin", "correctpass", AdminPriority.LOW);

        // When
        boolean isAuthenticated = userManager.isAuthenticated("admin", "correctpass");

        // Then
        assertThat(isAuthenticated).isTrue();
    }

    @Test
    void testIsAuthenticated_InvalidPassword() {
        // Given
        userManager.createSecurityAdmin("admin", "correctpass", AdminPriority.LOW);

        // When
        boolean isAuthenticated = userManager.isAuthenticated("admin", "wrongpass");

        // Then
        assertThat(isAuthenticated).isFalse();
    }

    @Test
    void testIsAuthenticated_NonExistentUser() {
        // When
        boolean isAuthenticated = userManager.isAuthenticated("nonexistent", "anypass");

        // Then
        assertThat(isAuthenticated).isFalse();
    }

    @Test
    void testAuthenticateSecurityAdmin_Success() {
        // Given
        userManager.createSecurityAdmin("admin", "adminpass", AdminPriority.HIGH);

        // When
        String token = userManager.authenticateSecurityAdmin("admin", "adminpass");

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
    }

    @Test
    void testAuthenticateSecurityAdmin_InvalidCredentials() {
        // Given
        userManager.createSecurityAdmin("admin", "adminpass", AdminPriority.HIGH);

        // When / Then
        assertThatThrownBy(() -> userManager.authenticateSecurityAdmin("admin", "wrongpass"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid username or password");
    }

    @Test
    void testGenerateAccessToken() {
        // When
        String token = userManager.generateAccessToken("testuser");

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts
    }

    @Test
    void testGenerateRefreshToken() {
        // When
        String token = userManager.generateRefreshToken("testuser");

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts
    }

    @Test
    void testIsUserRegistered_True() {
        // Given
        userManager.getOrCreateUser("testuser", "test@example.com");

        // When
        boolean isRegistered = userManager.isUserRegistered("test@example.com");

        // Then
        assertThat(isRegistered).isTrue();
    }

    @Test
    void testIsUserRegistered_False() {
        // When
        boolean isRegistered = userManager.isUserRegistered("nonexistent@example.com");

        // Then
        assertThat(isRegistered).isFalse();
    }

    @Test
    void testGetUser() {
        // Given
        User created = userManager.getOrCreateUser("testuser", "test@example.com");

        // When
        User retrieved = userManager.getUser("test@example.com");

        // Then
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getId()).isEqualTo(created.getId());
        assertThat(retrieved.getUsername()).isEqualTo("testuser");
    }

    @Test
    void testGetUser_NonExistent() {
        // When
        User user = userManager.getUser("nonexistent@example.com");

        // Then
        assertThat(user).isNull();
    }

    @Test
    void testRegisterToken() {
        // Given
        String email = "test@example.com";
        String token = "test-token-123";

        // When
        userManager.registerToken(email, token);

        // Then
        boolean isValid = userManager.checkToken(email, token);
        assertThat(isValid).isTrue();
    }

    @Test
    void testCheckToken_Invalid() {
        // Given
        String email = "test@example.com";
        String validToken = "valid-token";
        userManager.registerToken(email, validToken);

        // When
        boolean isValid = userManager.checkToken(email, "invalid-token");

        // Then
        assertThat(isValid).isFalse();
    }

    @Test
    void testCheckToken_NonExistentEmail() {
        // When
        boolean isValid = userManager.checkToken("nonexistent@example.com", "any-token");

        // Then
        assertThat(isValid).isFalse();
    }

    @Test
    void testRegisterMultipleTokensForSameUser() {
        // Given
        String email = "test@example.com";
        String token1 = "token-1";
        String token2 = "token-2";

        // When
        userManager.registerToken(email, token1);
        userManager.registerToken(email, token2);

        // Then
        assertThat(userManager.checkToken(email, token1)).isTrue();
        assertThat(userManager.checkToken(email, token2)).isTrue();
    }

    @Test
    void testPasswordHashing() {
        // Given
        String password = "mysecretpassword";

        // When
        User user = userManager.getOrCreateUser("testuser", "test@example.com", password);

        // Then
        assertThat(user.getPasswordHash()).isNotNull();
        assertThat(user.getPasswordHash()).isNotEqualTo(password); // Should be hashed
        assertThat(BcryptUtil.matches(password, user.getPasswordHash())).isTrue();
    }

    @Test
    void testCreateMultipleSecurityAdmins() {
        // When
        userManager.createSecurityAdmin("admin1", "pass1", AdminPriority.LOW);
        userManager.createSecurityAdmin("admin2", "pass2", AdminPriority.MEDIUM);
        userManager.createSecurityAdmin("admin3", "pass3", AdminPriority.HIGH);

        // Then
        assertThat(userManager.getSecurityAdminPriority("admin1")).isEqualTo(AdminPriority.LOW);
        assertThat(userManager.getSecurityAdminPriority("admin2")).isEqualTo(AdminPriority.MEDIUM);
        assertThat(userManager.getSecurityAdminPriority("admin3")).isEqualTo(AdminPriority.HIGH);
    }
}

