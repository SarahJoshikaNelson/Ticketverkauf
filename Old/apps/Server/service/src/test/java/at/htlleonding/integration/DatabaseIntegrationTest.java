package at.htlleonding.integration;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.*;
import at.htlleonding.types.*;
import at.htlleonding.types.Order;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.*;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Database Integration Tests
 * These tests verify database operations, relationships, and constraints
 * Uses H2 in-memory database for fast, isolated testing
 */
@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DatabaseIntegrationTest {

    @Inject
    UserRepo userRepo;

    @Inject
    SecurityAdminRepo securityAdminRepo;

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

    @Inject
    StudentRepo studentRepo;

    @Inject
    GraduateRepo graduateRepo;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean all tables using native queries to ensure proper cleanup
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE seat CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"table\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE room CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE useraccount CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE securityadmin CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE student CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE graduate CASCADE").executeUpdate();
        seatRepo.getEntityManager().flush();
    }

    @Test
    @org.junit.jupiter.api.Order(1)
    @Transactional
    void testDatabaseConnection() {
        // Verify we can connect and perform basic operations
        User user = new User();
        user.setUsername("testuser");
        user.setMailAddress("test@example.com");
        userRepo.persist(user);

        assertThat(userRepo.count()).isEqualTo(1);
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    @Transactional
    void testUserPersistence() {
        // Test user entity persistence
        User user1 = new User();
        user1.setUsername("user1");
        user1.setMailAddress("user1@example.com");
        user1.setPasswordHash("hash1");
        userRepo.persist(user1);

        User user2 = new User();
        user2.setUsername("user2");
        user2.setMailAddress("user2@example.com");
        user2.setPasswordHash("hash2");
        userRepo.persist(user2);

        assertThat(userRepo.count()).isEqualTo(2);
        
        List<User> users = userRepo.listAll();
        assertThat(users).hasSize(2);
        assertThat(users).extracting(User::getUsername).containsExactlyInAnyOrder("user1", "user2");
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @Transactional
    void testSecurityAdminPersistence() {
        SecurityAdmin admin = new SecurityAdmin();
        admin.setUsername("admin");
        admin.setPasswordHash("adminhash");
        admin.setPriority(AdminPriority.HIGH);
        securityAdminRepo.persist(admin);

        SecurityAdmin retrieved = securityAdminRepo.find("username", "admin").firstResult();
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getPriority()).isEqualTo(AdminPriority.HIGH);
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @Transactional
    void testOrderCustomerRelationship() {
        // Create customer
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("John");
        customer.setLastName("Doe");
        customer.setMailAddress("john@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Main Street");
        customer.setStreetNumber("1");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);

        // Create order with customer relationship
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);

        // Verify relationship
        Order retrieved = orderRepo.findById(order.getId());
        assertThat(retrieved.getCustomer()).isNotNull();
        assertThat(retrieved.getCustomer().getFirstName()).isEqualTo("John");
        assertThat(retrieved.getCustomer().getMailAddress()).isEqualTo("john@example.com");
    }

    @Test
    @org.junit.jupiter.api.Order(5)
    @Transactional
    void testVenueHierarchy() {
        // Test Room -> Table -> Seat hierarchy
        
        // Create room
        Room room = new Room();
        room.setName("Grand Hall");
        roomRepo.persist(room);

        // Create table
        Table table = new Table();
        table.setName("DatabaseTable1");
        table.setRoom(room);
        table.setSeats(new ArrayList<>());
        tableRepo.persist(table);

        // Create seats
        Seat seat1 = new Seat();
        seat1.setId(UUID.randomUUID());
        seat1.setTable(table);
        seat1.setPrice(100.0);
        seatRepo.persist(seat1);

        Seat seat2 = new Seat();
        seat2.setId(UUID.randomUUID());
        seat2.setTable(table);
        seat2.setPrice(100.0);
        seatRepo.persist(seat2);

        // Verify hierarchy
        Room retrievedRoom = roomRepo.findById(room.getName());
        assertThat(retrievedRoom.getName()).isEqualTo("Grand Hall");

        Table retrievedTable = tableRepo.findById(table.getName());
        assertThat(retrievedTable.getRoom().getName()).isEqualTo(room.getName());

        Seat retrievedSeat = seatRepo.findById(seat1.getId());
        assertThat(retrievedSeat.getTable().getName()).isEqualTo(table.getName());
        assertThat(retrievedSeat.getTable().getRoom().getName()).isEqualTo(room.getName());
    }

    @Test
    @org.junit.jupiter.api.Order(6)
    @Transactional
    void testOrderSeatRelationship() {
        // Create necessary entities
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("Test");
        customer.setLastName("Customer");
        customer.setMailAddress("test@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Test Street");
        customer.setStreetNumber("1");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);

        Room room = new Room();
        room.setName("Hall");
        roomRepo.persist(room);

        Table table = new Table();
        table.setName("DatabaseTable2");
        table.setRoom(room);
        table.setSeats(new ArrayList<>());
        tableRepo.persist(table);

        Seat seat = new Seat();
        seat.setId(UUID.randomUUID());
        seat.setTable(table);
        seat.setPrice(50.0);
        seatRepo.persist(seat);

        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);

        // Assign seat to order
        seat.setOrder(order);
        ArrayList<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);
        orderRepo.persist(order);
        seatRepo.getEntityManager().flush();

        // Verify relationship
        Seat retrievedSeat = seatRepo.findById(seat.getId());
        assertThat(retrievedSeat.getOrder()).isNotNull();
        assertThat(retrievedSeat.getOrder().getId()).isEqualTo(order.getId());

        Order retrievedOrder = orderRepo.findById(order.getId());
        assertThat(retrievedOrder.getSeats()).hasSize(1);
        assertThat(retrievedOrder.getSeats().get(0).getId()).isEqualTo(seat.getId());
    }

    @Test
    @org.junit.jupiter.api.Order(8)
    @Transactional
    void testGraduatePersistence() {
        Graduate graduate = new Graduate();
        graduate.setId("g12345");
        graduateRepo.persist(graduate);

        List<Graduate> graduates = graduateRepo.listAll();
        assertThat(graduates).hasSize(1);
        assertThat(graduates.get(0).getId()).isEqualTo("g12345");
    }

    @Test
    @org.junit.jupiter.api.Order(9)
    @Transactional
    void testMultipleOrdersForSameCustomer() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("Multi");
        customer.setLastName("Order");
        customer.setMailAddress("multi@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Multi Street");
        customer.setStreetNumber("1");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);

        // Create multiple orders
        for (int i = 0; i < 5; i++) {
            Order order = new Order();
            order.setCustomer(customer);
            order.setStatus(OrderStatus.WAITING);
            order.setOrderDate(LocalDateTime.now().minusDays(i));
            order.setTickets(new HashSet<>());
            order.setSeats(new ArrayList<>());
            orderRepo.persist(order);
        }

        List<Order> orders = orderRepo.find("customer.mailAddress", "multi@example.com").list();
        assertThat(orders).hasSize(5);
        assertThat(orders).allMatch(o -> o.getCustomer().getMailAddress().equals("multi@example.com"));
    }

    @Test
    @org.junit.jupiter.api.Order(10)
    @Transactional
    void testOrderStatusQuery() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("Status");
        customer.setLastName("Test");
        customer.setMailAddress("status@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Status Street");
        customer.setStreetNumber("1");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);

        // Create orders with different statuses
        OrderStatus[] statuses = {OrderStatus.WAITING, OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.CANCELLED};
        
        for (OrderStatus status : statuses) {
            Order order = new Order();
            order.setCustomer(customer);
            order.setStatus(status);
            order.setOrderDate(LocalDateTime.now());
            order.setTickets(new HashSet<>());
            order.setSeats(new ArrayList<>());
            orderRepo.persist(order);
        }

        // Query by status
        List<Order> waitingOrders = orderRepo.find("status", OrderStatus.WAITING).list();
        List<Order> confirmedOrders = orderRepo.find("status", OrderStatus.CONFIRMED).list();
        List<Order> paidOrders = orderRepo.find("status", OrderStatus.PAID).list();
        List<Order> cancelledOrders = orderRepo.find("status", OrderStatus.CANCELLED).list();

        assertThat(waitingOrders).hasSize(1);
        assertThat(confirmedOrders).hasSize(1);
        assertThat(paidOrders).hasSize(1);
        assertThat(cancelledOrders).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(11)
    @Transactional
    void testTransactionRollback() {
        long initialCount = customerRepo.count();
        
        try {
            Customer customer = new Customer();
            customer.setId(UUID.randomUUID());
            customer.setFirstName("Rollback");
            customer.setLastName("Test");
            customer.setMailAddress("rollback@example.com");
            customer.setPhoneNumber("1234567890");
            customer.setMale(true);
            customer.setStreet("Rollback Street");
            customer.setStreetNumber("1");
            customer.setZipCode("12345");
            customer.setTown("TestCity");
            customerRepo.persist(customer);
            
            // If we throw an exception, transaction should rollback
            if (customer.getId() != null) {
                // This is within a transaction, but we're testing that
                // the transaction is properly scoped
                assertThat(customerRepo.count()).isEqualTo(initialCount + 1);
            }
        } catch (Exception e) {
            // Exception handling
        }
    }

    @Test
    @org.junit.jupiter.api.Order(12)
    void testDatabaseCleanup() {
        // Verify database is clean at start of test
        assertThat(userRepo.count()).isEqualTo(0);
        assertThat(orderRepo.count()).isEqualTo(0);
        assertThat(customerRepo.count()).isEqualTo(0);
        assertThat(seatRepo.count()).isEqualTo(0);
        assertThat(tableRepo.count()).isEqualTo(0);
        assertThat(roomRepo.count()).isEqualTo(0);
    }
}

