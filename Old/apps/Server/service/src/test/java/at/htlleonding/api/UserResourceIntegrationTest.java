package at.htlleonding.api;

import at.htlleonding.repositories.UserRepo;
import at.htlleonding.types.dtos.UserLoginDTO;
import at.htlleonding.types.dtos.UserRegisterDTO;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class UserResourceIntegrationTest {

    @Inject
    UserRepo userRepo;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up before each test
        userRepo.deleteAll();
    }

    @AfterEach
    @Transactional
    void tearDown() {
        userRepo.deleteAll();
    }

    @Test
    void testRegisterUser_Success() {
        // Given
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "testuser",
                "test@example.com",
                "password123"
        );

        // When / Then
        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(201)
                .body(containsString("User registered successfully"));
    }

    @Test
    void testRegisterUser_DuplicateEmail() {
        // Given - register user first
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "testuser",
                "test@example.com",
                "password123"
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(201);

        // When / Then - try to register again with same email
        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(409)
                .body(containsString("User with this email already exists"));
    }

    @Test
    void testLoginUser_Success() {
        // Given - register user first
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "testuser",
                "test@example.com",
                "password123"
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .post("/api/v2/user/register");

        // When / Then - login
        UserLoginDTO loginDTO = new UserLoginDTO(
                "test@example.com",
                "password123"
        );

        given()
                .contentType(ContentType.JSON)
                .body(loginDTO)
                .when()
                .post("/api/v2/user/login")
                .then()
                .statusCode(200)
                .body("token", notNullValue());
    }

    @Test
    void testLoginUser_InvalidEmail() {
        // Given
        UserLoginDTO loginDTO = new UserLoginDTO(
                "nonexistent@example.com",
                "password123"
        );

        // When / Then
        given()
                .contentType(ContentType.JSON)
                .body(loginDTO)
                .when()
                .post("/api/v2/user/login")
                .then()
                .statusCode(404)
                .body(containsString("No user with the provided email found"));
    }

    @Test
    void testLoginUser_InvalidPassword() {
        // Given - register user first
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "testuser",
                "test@example.com",
                "correctpassword"
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .post("/api/v2/user/register");

        // When / Then - login with wrong password
        UserLoginDTO loginDTO = new UserLoginDTO(
                "test@example.com",
                "wrongpassword"
        );

        given()
                .contentType(ContentType.JSON)
                .body(loginDTO)
                .when()
                .post("/api/v2/user/login")
                .then()
                .statusCode(401)
                .body(containsString("Invalid password"));
    }

    @Test
    void testRegisterMultipleUsers() {
        // Given
        UserRegisterDTO user1 = new UserRegisterDTO(
                "user1",
                "user1@example.com",
                "password1"
        );

        UserRegisterDTO user2 = new UserRegisterDTO(
                "user2",
                "user2@example.com",
                "password2"
        );

        // When / Then
        given()
                .contentType(ContentType.JSON)
                .body(user1)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(201);

        given()
                .contentType(ContentType.JSON)
                .body(user2)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(201);
    }

    @Test
    void testRegisterAndLoginFlow() {
        // Given - register
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "flowuser",
                "flowuser@example.com",
                "flowpassword"
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .post("/api/v2/user/register")
                .then()
                .statusCode(201);

        // When / Then - login
        UserLoginDTO loginDTO = new UserLoginDTO(
                "flowuser@example.com",
                "flowpassword"
        );

        String token = given()
                .contentType(ContentType.JSON)
                .body(loginDTO)
                .when()
                .post("/api/v2/user/login")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .extract()
                .path("token");

        // Verify token is not empty
        assert !token.isEmpty();
    }
}

