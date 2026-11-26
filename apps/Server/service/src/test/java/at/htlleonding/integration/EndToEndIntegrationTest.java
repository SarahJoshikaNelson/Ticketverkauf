package at.htlleonding.integration;

import at.htlleonding.OrderManager;
import at.htlleonding.UserManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.*;
import at.htlleonding.types.Customer;
import at.htlleonding.types.Order;
import at.htlleonding.types.Room;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Table;
import at.htlleonding.types.User;
import at.htlleonding.types.dtos.UserLoginDTO;
import at.htlleonding.types.dtos.UserRegisterDTO;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.CoreMatchers.notNullValue;

/**
 * End-to-End Integration Tests
 * These tests verify the complete flow from HTTP request through business logic to database
 * All tests use H2 in-memory database configured in application-test.properties
 */
@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EndToEndIntegrationTest {

    @Inject
    UserManager userManager;

    @Inject
    OrderManager orderManager;

    @Inject
    UserRepo userRepo;

    @Inject
    OrderRepo orderRepo;

    @Inject
    CustomerRepo customerRepo;

    @Inject
    SeatRepo seatRepo;

    @Inject
    TableRepo tableRepo;

    @Inject
    RoomRepo roomRepo;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean database before each test using native queries to ensure proper cleanup
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE seat CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"table\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE room CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE useraccount CASCADE").executeUpdate();
        seatRepo.getEntityManager().flush();
    }

    @Test
    @org.junit.jupiter.api.Order(1)
    void testCompleteUserRegistrationAndLoginFlow() {
        // 1. Register a new user
        UserRegisterDTO registerDTO = new UserRegisterDTO(
                "endtoenduser",
                "e2e@example.com",
                "securepassword"
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerDTO)
                .when()
                .post("/api/v2/user/register")
                .then()
                .statusCode(201);

        // 2. Verify user exists in database
        User user = userManager.getUser("e2e@example.com");
        assertThat(user).isNotNull();
        assertThat(user.getUsername()).isEqualTo("endtoenduser");

        // 3. Login with the registered user
        UserLoginDTO loginDTO = new UserLoginDTO(
                "e2e@example.com",
                "securepassword"
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

        // 4. Verify token is valid
        assertThat(token).isNotNull();
        assertThat(token.split("\\.")).hasSize(3); // JWT structure

        // 5. Verify token is registered in the manager
        assertThat(userManager.checkToken("e2e@example.com", token)).isTrue();
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    @Transactional
    void testCompleteOrderCreationAndProcessingFlow() {
        // 1. Create customer
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("E2E");
        customer.setLastName("Customer");
        customer.setMailAddress("e2ecustomer@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("E2E Street");
        customer.setStreetNumber("123");
        customer.setZipCode("12345");
        customer.setTown("E2ECity");
        customerRepo.persist(customer);

        // 2. Create venue structure (Room -> Table -> Seat)
        Room room = new Room();
        room.setName("Main Hall");
        roomRepo.persist(room);

        Table table = new Table();
        table.setName("EndToEndTable1");
        table.setRoom(room);
        table.setSeats(new ArrayList<>());
        tableRepo.persist(table);

        Seat seat = new Seat();
        seat.setId(UUID.randomUUID());
        seat.setTable(table);
        seat.setPrice(100.0);
        seatRepo.persist(seat);

        // 3. Create order
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);

        // 4. Verify order is in WAITING status
        Order retrievedOrder = orderRepo.findById(order.getId());
        assertThat(retrievedOrder).isNotNull();
        assertThat(retrievedOrder.getStatus()).isEqualTo(OrderStatus.WAITING);

        // 5. Assign seat to order
        seat.setOrder(order);
        ArrayList<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);
        orderRepo.persist(order);
        seatRepo.getEntityManager().flush();

        // 6. Verify seat is taken
        boolean isSeatTaken = orderRepo.isSeatTaken(seat.getId());
        assertThat(isSeatTaken).isTrue();

        // 7. Progress order through lifecycle: WAITING -> CONFIRMED -> PAID
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.CONFIRMED);
        retrievedOrder = orderRepo.findById(order.getId());
        assertThat(retrievedOrder.getStatus()).isEqualTo(OrderStatus.CONFIRMED);

        orderManager.toggleOrderStatus(order.getId(), OrderStatus.PAID);
        retrievedOrder = orderRepo.findById(order.getId());
        assertThat(retrievedOrder.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(retrievedOrder.getInvoiceNumber()).isNotNull();
        assertThat(retrievedOrder.getInvoiceNumber()).isEqualTo(1L);

        // 8. Test order cancellation and seat release
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.CANCELLED);
        retrievedOrder = orderRepo.findById(order.getId());
        assertThat(retrievedOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);

        // Verify seat is released
        Seat releasedSeat = seatRepo.findById(seat.getId());
        assertThat(releasedSeat.getOrder()).isNull();
        assertThat(orderRepo.isSeatTaken(seat.getId())).isFalse();
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @Transactional
    void testConcurrentOrdersAndSeatReservations() {
        // 1. Create multiple customers
        Customer customer1 = createCustomer("customer1@example.com", "Customer", "One");
        Customer customer2 = createCustomer("customer2@example.com", "Customer", "Two");
        Customer customer3 = createCustomer("customer3@example.com", "Customer", "Three");

        // 2. Create venue with multiple seats
        Room room = new Room();
        room.setName("Concert Hall");
        roomRepo.persist(room);

        Table table = new Table();
        table.setName("EndToEndTable2");
        table.setRoom(room);
        table.setSeats(new ArrayList<>());
        tableRepo.persist(table);

        Seat seat1 = createSeat(table, "A1", 100.0);
        Seat seat2 = createSeat(table, "A2", 100.0);
        Seat seat3 = createSeat(table, "A3", 100.0);

        // 3. Create orders for each customer
        Order order1 = createOrder(customer1);
        Order order2 = createOrder(customer2);
        Order order3 = createOrder(customer3);

        // 4. Assign different seats to each order
        assignSeatToOrder(seat1, order1);
        assignSeatToOrder(seat2, order2);
        assignSeatToOrder(seat3, order3);

        // 5. Verify all seats are taken
        assertThat(orderRepo.isSeatTaken(seat1.getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(seat2.getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(seat3.getId())).isTrue();

        // 6. Cancel one order and verify seat is released
        orderManager.toggleOrderStatus(order2.getId(), OrderStatus.CANCELLED);
        assertThat(orderRepo.isSeatTaken(seat2.getId())).isFalse();
        assertThat(orderRepo.isSeatTaken(seat1.getId())).isTrue(); // Others still taken
        assertThat(orderRepo.isSeatTaken(seat3.getId())).isTrue();

        // 7. Verify we can retrieve orders by customer
        Order[] customer1Orders = orderManager.getOrders("customer1@example.com");
        assertThat(customer1Orders).hasSize(1);
        assertThat(customer1Orders[0].getId()).isEqualTo(order1.getId());
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @Transactional
    void testOrderInvoiceNumbering() {
        // 1. Create multiple customers and orders
        Customer customer1 = createCustomer("invoice1@example.com", "Invoice", "One");
        Customer customer2 = createCustomer("invoice2@example.com", "Invoice", "Two");
        Customer customer3 = createCustomer("invoice3@example.com", "Invoice", "Three");

        Order order1 = createOrder(customer1);
        Order order2 = createOrder(customer2);
        Order order3 = createOrder(customer3);

        // 2. Mark orders as PAID (which generates invoice numbers)
        orderManager.toggleOrderStatus(order1.getId(), OrderStatus.PAID);
        orderManager.toggleOrderStatus(order2.getId(), OrderStatus.PAID);
        orderManager.toggleOrderStatus(order3.getId(), OrderStatus.PAID);

        // 3. Verify sequential invoice numbers
        Order paid1 = orderRepo.findById(order1.getId());
        Order paid2 = orderRepo.findById(order2.getId());
        Order paid3 = orderRepo.findById(order3.getId());

        assertThat(paid1.getInvoiceNumber()).isEqualTo(1L);
        assertThat(paid2.getInvoiceNumber()).isEqualTo(2L);
        assertThat(paid3.getInvoiceNumber()).isEqualTo(3L);
    }

    @Test
    @org.junit.jupiter.api.Order(5)
    void testDatabaseIsolationBetweenTests() {
        // This test verifies that each test starts with a clean database
        // If previous tests properly cleaned up, these counts should be 0
        
        long userCount = userRepo.count();
        long orderCount = orderRepo.count();
        long customerCount = customerRepo.count();
        long seatCount = seatRepo.count();

        assertThat(userCount).isEqualTo(0);
        assertThat(orderCount).isEqualTo(0);
        assertThat(customerCount).isEqualTo(0);
        assertThat(seatCount).isEqualTo(0);
    }

    // Helper methods

    @Transactional
    Customer createCustomer(String email, String firstName, String lastName) {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName(firstName);
        customer.setLastName(lastName);
        customer.setMailAddress(email);
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Test Street");
        customer.setStreetNumber("123");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);
        return customer;
    }

    @Transactional
    Order createOrder(Customer customer) {
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);
        return order;
    }

    @Transactional
    Seat createSeat(Table table, String name, double price) {
        Seat seat = new Seat();
        seat.setId(UUID.randomUUID());
        seat.setTable(table);
        seat.setPrice(price);
        seatRepo.persist(seat);
        return seat;
    }

    @Transactional
    void assignSeatToOrder(Seat seat, Order order) {
        seat.setOrder(order);
        ArrayList<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);
        orderRepo.persist(order);
        seatRepo.getEntityManager().flush();
    }
}

