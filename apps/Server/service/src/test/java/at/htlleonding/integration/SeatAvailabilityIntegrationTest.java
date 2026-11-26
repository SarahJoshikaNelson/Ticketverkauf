package at.htlleonding.integration;

import at.htlleonding.OrderManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.*;
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
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests specifically for seat availability and reservation logic
 * Tests complex scenarios involving multiple orders and seat conflicts
 */
@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class SeatAvailabilityIntegrationTest {

    @Inject
    OrderManager orderManager;

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

    private Room testRoom;
    private Table testTable;
    private List<Seat> testSeats;
    private List<Customer> testCustomers;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up using native queries to ensure proper cleanup
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE seat CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"table\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE room CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        seatRepo.getEntityManager().flush();

        // Create venue
        testRoom = new Room();
        testRoom.setName("Test Venue");
        roomRepo.persist(testRoom);

        testTable = new Table();
        testTable.setName("TestTable1");
        testTable.setRoom(testRoom);
        testTable.setSeats(new ArrayList<>());
        tableRepo.persist(testTable);

        // Create multiple seats
        testSeats = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            Seat seat = new Seat();
            seat.setId(UUID.randomUUID());
            seat.setTable(testTable);
            seat.setPrice(100.0);
            seatRepo.persist(seat);
            testSeats.add(seat);
        }

        // Create multiple customers
        testCustomers = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Customer customer = new Customer();
            customer.setId(UUID.randomUUID());
            customer.setFirstName("Customer");
            customer.setLastName("Number-" + i);
            customer.setMailAddress("customer" + i + "@example.com");
            customer.setPhoneNumber("123456789" + i);
            customer.setMale(true);
            customer.setStreet("Test Street");
            customer.setStreetNumber(String.valueOf(i));
            customer.setZipCode("12345");
            customer.setTown("TestCity");
            customerRepo.persist(customer);
            testCustomers.add(customer);
        }
    }

    @AfterEach
    @Transactional
    void tearDown() {
        // Clean up using native queries to ensure proper cleanup
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE seat CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"table\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE room CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        seatRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        seatRepo.getEntityManager().flush();
    }

    @Test
    @Transactional
    void testSeatAvailability_InitiallyAllSeatsAvailable() {
        // All seats should be available initially
        for (Seat seat : testSeats) {
            assertThat(orderRepo.isSeatTaken(seat.getId())).isFalse();
        }
    }

    @Test
    @Transactional
    void testReserveSingleSeat() {
        // Given
        Customer customer = testCustomers.get(0);
        Seat seat = testSeats.get(0);

        // When
        Order order = createOrderWithSeat(customer, seat);

        // Then
        assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();
        Seat retrievedSeat = seatRepo.findById(seat.getId());
        assertThat(retrievedSeat.getOrder()).isNotNull();
        assertThat(retrievedSeat.getOrder().getId()).isEqualTo(order.getId());
    }

    @Test
    @Transactional
    void testReserveMultipleSeats() {
        // Given
        Customer customer = testCustomers.get(0);
        List<Seat> seatsToReserve = testSeats.subList(0, 3);

        // When
        Order order = createOrderWithSeats(customer, seatsToReserve);

        // Then
        for (Seat seat : seatsToReserve) {
            assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();
        }
        
        // Other seats should still be available
        for (Seat seat : testSeats.subList(3, testSeats.size())) {
            assertThat(orderRepo.isSeatTaken(seat.getId())).isFalse();
        }
    }

    @Test
    @Transactional
    void testConcurrentReservations_DifferentSeats() {
        // Given - multiple customers reserving different seats
        Order order1 = createOrderWithSeat(testCustomers.get(0), testSeats.get(0));
        Order order2 = createOrderWithSeat(testCustomers.get(1), testSeats.get(1));
        Order order3 = createOrderWithSeat(testCustomers.get(2), testSeats.get(2));

        // Then
        assertThat(orderRepo.isSeatTaken(testSeats.get(0).getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(testSeats.get(1).getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(testSeats.get(2).getId())).isTrue();
        
        // Verify each seat belongs to correct order
        assertThat(seatRepo.findById(testSeats.get(0).getId()).getOrder().getId()).isEqualTo(order1.getId());
        assertThat(seatRepo.findById(testSeats.get(1).getId()).getOrder().getId()).isEqualTo(order2.getId());
        assertThat(seatRepo.findById(testSeats.get(2).getId()).getOrder().getId()).isEqualTo(order3.getId());
    }

    @Test
    @Transactional
    void testCancelOrder_ReleasesSeats() {
        // Given
        Customer customer = testCustomers.get(0);
        List<Seat> reservedSeats = testSeats.subList(0, 3);
        Order order = createOrderWithSeats(customer, reservedSeats);

        // Verify seats are taken
        for (Seat seat : reservedSeats) {
            assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();
        }

        // When
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.CANCELLED);

        // Then - seats should be released
        for (Seat seat : reservedSeats) {
            assertThat(orderRepo.isSeatTaken(seat.getId())).isFalse();
            Seat retrievedSeat = seatRepo.findById(seat.getId());
            assertThat(retrievedSeat.getOrder()).isNull();
        }
    }

    @Test
    @Transactional
    void testReactivateCancelledOrder_SeatsStillAvailable() {
        // Given - order with seats, then cancelled
        Customer customer = testCustomers.get(0);
        Seat seat = testSeats.get(0);
        Order order = createOrderWithSeat(customer, seat);
        
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.CANCELLED);
        assertThat(orderRepo.isSeatTaken(seat.getId())).isFalse();

        // When - reactivate order
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.WAITING);

        // Then - seat should be taken again
        assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();
        Seat retrievedSeat = seatRepo.findById(seat.getId());
        assertThat(retrievedSeat.getOrder()).isNotNull();
        assertThat(retrievedSeat.getOrder().getId()).isEqualTo(order.getId());
    }

    @Test
    @Transactional
    void testReactivateCancelledOrder_SeatNowTaken_ShouldFail() {
        // Given - order1 with seat, then cancelled
        Customer customer1 = testCustomers.get(0);
        Customer customer2 = testCustomers.get(1);
        Seat seat = testSeats.get(0);
        
        Order order1 = createOrderWithSeat(customer1, seat);
        orderManager.toggleOrderStatus(order1.getId(), OrderStatus.CANCELLED);
        
        // Another customer takes the seat
        Order order2 = createOrderWithSeat(customer2, seat);
        assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();

        // When/Then - trying to reactivate order1 should fail
        assertThatThrownBy(() -> orderManager.toggleOrderStatus(order1.getId(), OrderStatus.WAITING))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    @Transactional
    void testOrderProgression_SeatsRemainTaken() {
        // Given
        Customer customer = testCustomers.get(0);
        Seat seat = testSeats.get(0);
        Order order = createOrderWithSeat(customer, seat);

        // When - progress through order statuses
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.CONFIRMED);
        assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();

        orderManager.toggleOrderStatus(order.getId(), OrderStatus.PAID);
        assertThat(orderRepo.isSeatTaken(seat.getId())).isTrue();

        // Then - seat remains taken through all status changes
        Seat retrievedSeat = seatRepo.findById(seat.getId());
        assertThat(retrievedSeat.getOrder()).isNotNull();
        assertThat(retrievedSeat.getOrder().getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    @Transactional
    void testMultipleOrdersPerCustomer_DifferentSeats() {
        // Given - one customer with multiple orders
        Customer customer = testCustomers.get(0);
        
        // When
        Order order1 = createOrderWithSeat(customer, testSeats.get(0));
        Order order2 = createOrderWithSeat(customer, testSeats.get(1));
        Order order3 = createOrderWithSeat(customer, testSeats.get(2));

        // Then
        assertThat(orderRepo.isSeatTaken(testSeats.get(0).getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(testSeats.get(1).getId())).isTrue();
        assertThat(orderRepo.isSeatTaken(testSeats.get(2).getId())).isTrue();

        Order[] customerOrders = orderManager.getOrders(customer.getMailAddress());
        assertThat(customerOrders).hasSize(3);
    }

    @Test
    @Transactional
    void testAvailableSeatsCount() {
        // Given - reserve some seats
        createOrderWithSeat(testCustomers.get(0), testSeats.get(0));
        createOrderWithSeat(testCustomers.get(1), testSeats.get(1));
        createOrderWithSeat(testCustomers.get(2), testSeats.get(2));

        // When - count taken and available seats
        long takenSeats = 0;
        long availableSeats = 0;
        
        for (Seat seat : testSeats) {
            if (orderRepo.isSeatTaken(seat.getId())) {
                takenSeats++;
            } else {
                availableSeats++;
            }
        }

        // Then
        assertThat(takenSeats).isEqualTo(3);
        assertThat(availableSeats).isEqualTo(7);
    }

    @Test
    @Transactional
    void testSeatReservation_CancelledOrdersNotCounted() {
        // Given - mix of active and cancelled orders
        Order activeOrder1 = createOrderWithSeat(testCustomers.get(0), testSeats.get(0));
        Order cancelledOrder = createOrderWithSeat(testCustomers.get(1), testSeats.get(1));
        Order activeOrder2 = createOrderWithSeat(testCustomers.get(2), testSeats.get(2));

        orderManager.toggleOrderStatus(cancelledOrder.getId(), OrderStatus.CANCELLED);

        // When - check seat availability
        boolean seat0Taken = orderRepo.isSeatTaken(testSeats.get(0).getId());
        boolean seat1Taken = orderRepo.isSeatTaken(testSeats.get(1).getId());
        boolean seat2Taken = orderRepo.isSeatTaken(testSeats.get(2).getId());

        // Then
        assertThat(seat0Taken).isTrue();  // Active order
        assertThat(seat1Taken).isFalse(); // Cancelled order - not counted as taken
        assertThat(seat2Taken).isTrue();  // Active order
    }

    // Helper methods

    @Transactional
    Order createOrderWithSeat(Customer customer, Seat seat) {
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);

        seat.setOrder(order);
        seat = seatRepo.getEntityManager().merge(seat); // Merge to track changes
        ArrayList<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);
        orderRepo.persist(order);
        seatRepo.getEntityManager().flush();

        return order;
    }

    @Transactional
    Order createOrderWithSeats(Customer customer, List<Seat> seatsToReserve) {
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.WAITING);
        order.setOrderDate(LocalDateTime.now());
        order.setTickets(new HashSet<>());
        order.setSeats(new ArrayList<>());
        orderRepo.persist(order);

        ArrayList<Seat> seats = new ArrayList<>();
        for (Seat seat : seatsToReserve) {
            seat.setOrder(order);
            Seat mergedSeat = seatRepo.getEntityManager().merge(seat); // Merge to track changes
            seats.add(mergedSeat);
        }
        order.setSeats(seats);
        orderRepo.persist(order);
        seatRepo.getEntityManager().flush();

        return order;
    }
}

