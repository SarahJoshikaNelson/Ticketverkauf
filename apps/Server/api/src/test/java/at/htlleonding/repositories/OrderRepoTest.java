package at.htlleonding.repositories;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.types.*;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class OrderRepoTest {

    @Inject
    OrderRepo orderRepo;

    @Inject
    CustomerRepo customerRepo;

    @Inject
    SeatRepo seatRepo;

    @Inject
    RoomRepo roomRepo;

    @Inject
    TableRepo tableRepo;

    @Inject
    jakarta.persistence.EntityManager entityManager;

    private Order testOrder;
    private Customer testCustomer;
    private Seat testSeat;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up - delete in correct order to avoid FK violations
        seatRepo.deleteAll();
        orderRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        customerRepo.deleteAll();

        // Create customer
        testCustomer = new Customer();
        testCustomer.setId(UUID.randomUUID());
        testCustomer.setFirstName("John");
        testCustomer.setLastName("Doe");
        testCustomer.setMailAddress("john.doe@example.com");
        testCustomer.setPhoneNumber("1234567890");
        testCustomer.setMale(true);
        testCustomer.setStreet("Main St");
        testCustomer.setStreetNumber("123");
        testCustomer.setZipCode("12345");
        testCustomer.setTown("TestCity");
        customerRepo.persist(testCustomer);

        // Create room
        Room room = new Room();
        room.setName("Main Hall");
        roomRepo.persist(room);

        // Create table
        at.htlleonding.types.Table table = new at.htlleonding.types.Table();
        table.setName("Table1");
        table.setRoom(room);
        table.setSeats(new ArrayList<>());
        tableRepo.persist(table);

        // Create seat
        testSeat = new Seat();
        testSeat.setId(UUID.randomUUID()); // Set ID manually for Seat
        testSeat.setTable(table);
        testSeat.setPrice(50.0);
        seatRepo.persist(testSeat);

        // Create order
        testOrder = new Order();
        testOrder.setCustomer(testCustomer);
        testOrder.setStatus(OrderStatus.WAITING);
        testOrder.setOrderDate(LocalDateTime.now());
        testOrder.setTickets(new HashSet<>());
        testOrder.setSeats(new ArrayList<>());
        orderRepo.persist(testOrder);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        // Delete in correct order to avoid FK violations
        seatRepo.deleteAll();
        orderRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        customerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistOrder() {
        // Given
        Customer newCustomer = new Customer();
        newCustomer.setId(UUID.randomUUID());
        newCustomer.setFirstName("Jane");
        newCustomer.setLastName("Smith");
        newCustomer.setMailAddress("jane.smith@example.com");
        newCustomer.setPhoneNumber("9876543210");
        newCustomer.setMale(false);
        newCustomer.setStreet("Jane St");
        newCustomer.setStreetNumber("456");
        newCustomer.setZipCode("54321");
        newCustomer.setTown("JaneCity");
        customerRepo.persist(newCustomer);

        Order newOrder = new Order();
        newOrder.setCustomer(newCustomer);
        newOrder.setStatus(OrderStatus.CONFIRMED);
        newOrder.setOrderDate(LocalDateTime.now());
        newOrder.setTickets(new HashSet<>());
        newOrder.setSeats(new ArrayList<>());

        // When
        orderRepo.persist(newOrder);

        // Then
        assertThat(newOrder.getId()).isNotNull();
        Order found = orderRepo.findById(newOrder.getId());
        assertThat(found).isNotNull();
        assertThat(found.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(found.getCustomer().getFirstName()).isEqualTo("Jane");
    }

    @Test
    void testFindById() {
        // When
        Order found = orderRepo.findById(testOrder.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getStatus()).isEqualTo(OrderStatus.WAITING);
        assertThat(found.getCustomer().getMailAddress()).isEqualTo("john.doe@example.com");
    }

    @Test
    @Transactional
    void testFindUnconfirmedOrdersOlderThan() {
        // Given - create an old unconfirmed order
        Customer customer2 = new Customer();
        customer2.setId(UUID.randomUUID());
        customer2.setFirstName("Old");
        customer2.setLastName("Order");
        customer2.setMailAddress("old@example.com");
        customer2.setPhoneNumber("1111111111");
        customer2.setMale(true);
        customer2.setStreet("Old St");
        customer2.setStreetNumber("789");
        customer2.setZipCode("99999");
        customer2.setTown("OldCity");
        customerRepo.persist(customer2);

        Order oldOrder = new Order();
        oldOrder.setCustomer(customer2);
        oldOrder.setStatus(OrderStatus.WAITING);
        oldOrder.setTickets(new HashSet<>());
        oldOrder.setSeats(new ArrayList<>());
        orderRepo.persist(oldOrder);
        entityManager.flush(); // Persist first to get the ID
        
        // Update orderDate using native query to bypass @CreationTimestamp
        LocalDateTime oldDate = LocalDateTime.now().minusHours(2);
        entityManager.createNativeQuery("UPDATE \"order\" SET orderdate = ?1 WHERE id = ?2")
                .setParameter(1, oldDate)
                .setParameter(2, oldOrder.getId())
                .executeUpdate();
        entityManager.flush();

        // When
        LocalDateTime cutoff = LocalDateTime.now().minusHours(1);
        List<Order> oldOrders = orderRepo.findUnconfirmedOrdersOlderThan(cutoff);

        // Then
        assertThat(oldOrders).isNotEmpty();
        assertThat(oldOrders).hasSize(1);
        assertThat(oldOrders.get(0).getId()).isEqualTo(oldOrder.getId());
    }

    @Test
    @Transactional
    void testIsSeatTaken_WhenSeatIsNotTaken() {
        // When
        boolean isTaken = orderRepo.isSeatTaken(testSeat.getId());

        // Then
        assertThat(isTaken).isFalse();
    }

    @Test
    @Transactional
    void testIsSeatTaken_WhenSeatIsTaken() {
        // Given - assign seat to order
        Order order = orderRepo.findById(testOrder.getId());
        Seat seat = seatRepo.findById(testSeat.getId());
        seat.setOrder(order);
        
        List<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);

        // When
        boolean isTaken = orderRepo.isSeatTaken(seat.getId());

        // Then
        assertThat(isTaken).isTrue();
    }

    @Test
    @Transactional
    void testIsSeatTaken_WhenOrderIsCancelled() {
        // Given - assign seat to cancelled order
        Order order = orderRepo.findById(testOrder.getId());
        order.setStatus(OrderStatus.CANCELLED);
        
        Seat seat = seatRepo.findById(testSeat.getId());
        seat.setOrder(order);
        
        List<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);

        // When
        boolean isTaken = orderRepo.isSeatTaken(seat.getId());

        // Then
        assertThat(isTaken).isFalse(); // Cancelled orders don't count as taken
    }

    @Test
    void testListAll() {
        // When
        List<Order> orders = orderRepo.listAll();

        // Then
        assertThat(orders).isNotEmpty();
        assertThat(orders).hasSize(1);
    }

    @Test
    @Transactional
    void testUpdateOrderStatus() {
        // Given
        Order order = orderRepo.findById(testOrder.getId());

        // When
        order.setStatus(OrderStatus.PAID);
        orderRepo.persist(order);

        // Then
        Order updated = orderRepo.findById(testOrder.getId());
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    @Transactional
    void testDeleteOrder() {
        // Given
        UUID orderId = testOrder.getId();

        // When
        orderRepo.delete(testOrder);

        // Then
        Order deleted = orderRepo.findById(orderId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testFindOrdersByCustomerEmail() {
        // When
        List<Order> orders = orderRepo.find("customer.mailAddress", "john.doe@example.com").list();

        // Then
        assertThat(orders).isNotEmpty();
        assertThat(orders).hasSize(1);
        assertThat(orders.get(0).getCustomer().getFirstName()).isEqualTo("John");
    }

    @Test
    @Transactional
    void testFindOrdersByStatus() {
        // Given - create orders with different statuses
        Customer customer2 = new Customer();
        customer2.setId(UUID.randomUUID());
        customer2.setFirstName("Jane");
        customer2.setLastName("Doe");
        customer2.setMailAddress("jane@example.com");
        customer2.setPhoneNumber("2222222222");
        customer2.setMale(false);
        customer2.setStreet("Jane St");
        customer2.setStreetNumber("456");
        customer2.setZipCode("54321");
        customer2.setTown("JaneCity");
        customerRepo.persist(customer2);

        Order confirmedOrder = new Order();
        confirmedOrder.setCustomer(customer2);
        confirmedOrder.setStatus(OrderStatus.CONFIRMED);
        confirmedOrder.setOrderDate(LocalDateTime.now());
        confirmedOrder.setTickets(new HashSet<>());
        confirmedOrder.setSeats(new ArrayList<>());
        orderRepo.persist(confirmedOrder);

        // When
        List<Order> waitingOrders = orderRepo.find("status", OrderStatus.WAITING).list();
        List<Order> confirmedOrders = orderRepo.find("status", OrderStatus.CONFIRMED).list();

        // Then
        assertThat(waitingOrders).hasSize(1);
        assertThat(confirmedOrders).hasSize(1);
    }

    @Test
    @Transactional
    void testSetInvoiceNumber() {
        // Given
        Order order = orderRepo.findById(testOrder.getId());

        // When
        order.setInvoiceNumber(1001L);
        orderRepo.persist(order);

        // Then
        Order updated = orderRepo.findById(testOrder.getId());
        assertThat(updated.getInvoiceNumber()).isEqualTo(1001L);
    }
}

