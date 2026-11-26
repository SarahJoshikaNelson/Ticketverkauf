package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.*;
import at.htlleonding.types.*;
import at.htlleonding.types.dtos.CustomerDTO;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.*;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class OrderManagerTest {

    @Inject
    OrderManager orderManager;

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

    @InjectMock
    MailManager mailManager;

    @InjectMock
    PDFManager pdfManager;

    @InjectMock
    AdminManager adminManager;

    @InjectMock
    SettingManager settingManager;

    @InjectMock
    TicketManager ticketManager;

    @InjectMock
    DataManager dataManager;

    @Inject
    jakarta.persistence.EntityManager entityManager;

    private Order testOrder;
    private Customer testCustomer;
    private Seat testSeat;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up - delete in correct order to avoid FK violations
        // Delete seats first (they reference orders and tables)
        seatRepo.deleteAll();
        // Then delete orders (they reference customers)
        orderRepo.deleteAll();
        // Then delete tables (they reference rooms)
        tableRepo.deleteAll();
        // Then delete rooms
        roomRepo.deleteAll();
        // Finally delete customers
        customerRepo.deleteAll();

        // Reset mocks
        Mockito.reset(mailManager, pdfManager, adminManager);

        // Create test data
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
        table.setName("OrderManagerTable1");
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
        // Clean up - delete in correct order to avoid FK violations
        seatRepo.deleteAll();
        orderRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        customerRepo.deleteAll();
    }

    @Test
    void testToggleOrderStatus_ToConfirmed() {
        // Given
        when(ticketManager.getAdditionalChargeForPhysicalTicket()).thenReturn(5.0);
        when(ticketManager.getAdditionalChargeForPhysicalTicketFormatted()).thenReturn("5,00 €");
        when(dataManager.getData()).thenReturn(new Data());

        // When
        orderManager.toggleOrderStatus(testOrder.getId(), OrderStatus.CONFIRMED);

        // Then
        Order updated = orderRepo.findById(testOrder.getId());
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        
        // Give the background thread time to execute
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Verify that confirmation email was sent
        verify(mailManager, timeout(500).times(1)).sendConfirmationMail(any(), any(), any());
    }

    @Test
    void testToggleOrderStatus_ToCancelled() {
        // When
        orderManager.toggleOrderStatus(testOrder.getId(), OrderStatus.CANCELLED);

        // Then
        Order updated = orderRepo.findById(testOrder.getId());
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void testToggleOrderStatus_NonExistentOrder() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // When / Then
        assertThatThrownBy(() -> orderManager.toggleOrderStatus(nonExistentId, OrderStatus.CONFIRMED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    @Transactional
    void testToggleOrderStatus_ReactivateCancelledOrder_SeatAvailable() {
        // Given - cancelled order with seat
        Order order = orderRepo.findById(testOrder.getId());
        order.setStatus(OrderStatus.CANCELLED);
        
        Seat seat = seatRepo.findById(testSeat.getId());
        seat.setOrder(null); // Seat is free
        
        List<Seat> seats = new ArrayList<>();
        seats.add(seat);
        order.setSeats(seats);

        // When
        orderManager.toggleOrderStatus(order.getId(), OrderStatus.WAITING);

        // Then
        Order updated = orderRepo.findById(order.getId());
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.WAITING);
        
        Seat updatedSeat = seatRepo.findById(seat.getId());
        assertThat(updatedSeat.getOrder()).isNotNull();
        assertThat(updatedSeat.getOrder().getId()).isEqualTo(order.getId());
    }

    @Test
    void testConfirmOrder() {
        // Given
        when(ticketManager.getAdditionalChargeForPhysicalTicket()).thenReturn(5.0);
        when(ticketManager.getAdditionalChargeForPhysicalTicketFormatted()).thenReturn("5,00 €");
        when(dataManager.getData()).thenReturn(new Data());
        // sendConfirmationMail is void, no need to explicitly mock

        // When
        orderManager.confirmOrder(testOrder.getId());

        // Then
        Order updated = orderRepo.findById(testOrder.getId());
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(mailManager).sendConfirmationMail(any(), any(), any());
    }

    @Test
    void testConfirmOrder_NonExistentOrder() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // When / Then
        assertThatThrownBy(() -> orderManager.confirmOrder(nonExistentId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    @Transactional
    void testRemoveUnconfirmedOrdersOlderThan() {
        // Given - create an old unconfirmed order
        Customer customer2 = new Customer();
        customer2.setId(UUID.randomUUID());
        customer2.setFirstName("Old");
        customer2.setLastName("Order");
        customer2.setMailAddress("old@example.com");
        customer2.setPhoneNumber("1111111111");
        customer2.setMale(true);
        customer2.setStreet("Old St");
        customer2.setStreetNumber("456");
        customer2.setZipCode("54321");
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
        UUID oldOrderId = oldOrder.getId();

        long initialCount = orderRepo.count();
        assertThat(initialCount).isEqualTo(2L); // Should have testOrder and oldOrder

        // When
        orderManager.removeUnconfirmedOrdersOlderThan(Duration.ofHours(1));
        entityManager.flush(); // Flush the deletion
        entityManager.clear(); // Clear persistence context to force fresh read

        // Then
        long finalCount = orderRepo.count();
        assertThat(finalCount).isEqualTo(1L); // Should have only testOrder remaining
        assertThat(orderRepo.findById(oldOrderId)).isNull();
        assertThat(orderRepo.findById(testOrder.getId())).isNotNull(); // Recent order still exists
    }

    @Test
    @Transactional
    void testRemoveUnconfirmedOrdersOlderThan_WithSeats() {
        // Given - create an old order with seats
        Customer customer2 = new Customer();
        customer2.setId(UUID.randomUUID());
        customer2.setFirstName("Old");
        customer2.setLastName("Order");
        customer2.setMailAddress("old@example.com");
        customer2.setPhoneNumber("1111111111");
        customer2.setMale(true);
        customer2.setStreet("Old St");
        customer2.setStreetNumber("456");
        customer2.setZipCode("54321");
        customer2.setTown("OldCity");
        customerRepo.persist(customer2);

        Order oldOrder = new Order();
        oldOrder.setCustomer(customer2);
        oldOrder.setStatus(OrderStatus.WAITING);
        oldOrder.setTickets(new HashSet<>());
        
        // Create and assign seat
        Seat oldSeat = new Seat();
        oldSeat.setId(UUID.randomUUID()); // Set ID manually for Seat
        oldSeat.setTable(testSeat.getTable());
        oldSeat.setPrice(50.0);
        seatRepo.persist(oldSeat);
        
        oldSeat.setOrder(oldOrder);
        List<Seat> seats = new ArrayList<>();
        seats.add(oldSeat);
        oldOrder.setSeats(seats);
        orderRepo.persist(oldOrder);
        seatRepo.persist(oldSeat); // Persist the seat with its order reference
        entityManager.flush(); // Persist first
        
        // Update orderDate using native query to bypass @CreationTimestamp
        LocalDateTime oldDate = LocalDateTime.now().minusHours(2);
        entityManager.createNativeQuery("UPDATE \"order\" SET orderdate = ?1 WHERE id = ?2")
                .setParameter(1, oldDate)
                .setParameter(2, oldOrder.getId())
                .executeUpdate();
        entityManager.flush();
        UUID oldOrderId = oldOrder.getId();
        UUID oldSeatId = oldSeat.getId();

        // When
        orderManager.removeUnconfirmedOrdersOlderThan(Duration.ofHours(1));
        entityManager.flush(); // Flush the deletion
        entityManager.clear(); // Clear persistence context to force fresh read

        // Then
        assertThat(orderRepo.findById(oldOrderId)).isNull();
        Seat freedSeat = seatRepo.findById(oldSeatId);
        assertThat(freedSeat).isNotNull();
        assertThat(freedSeat.getOrder()).isNull();
    }

    @Test
    @Transactional
    void testGetOrders() {
        // Given - create another order for the same customer
        Order order2 = new Order();
        order2.setCustomer(testCustomer);
        order2.setStatus(OrderStatus.CONFIRMED);
        order2.setOrderDate(LocalDateTime.now());
        order2.setTickets(new HashSet<>());
        order2.setSeats(new ArrayList<>());
        orderRepo.persist(order2);

        // When
        Order[] orders = orderManager.getOrders("john.doe@example.com");

        // Then
        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(Order::getCustomer)
                .extracting(Customer::getMailAddress)
                .containsOnly("john.doe@example.com");
    }

    @Test
    void testGetOrders_NoOrders() {
        // When
        Order[] orders = orderManager.getOrders("nonexistent@example.com");

        // Then
        assertThat(orders).isEmpty();
    }

    @Test
    @Transactional
    void testGetTicketDownloads() {
        // Given
        when(ticketManager.getTicketDownload(any())).thenReturn(new byte[]{1, 2, 3});

        // Add a ticket to the order (need to set required fields and persist to generate ID)
        Order order = orderRepo.findById(testOrder.getId());
        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID()); // Manually set ID or persist first
        ticket.setOrder(order);
        ticket.setTicketType(at.htlleonding.enums.TicketType.STUDENT);
        ticket.setPhysical(false);
        HashSet<Ticket> tickets = new HashSet<>();
        tickets.add(ticket);
        order.setTickets(tickets);

        // When
        List<byte[]> downloads = orderManager.getTicketDownloads(order.getId());

        // Then
        assertThat(downloads).isNotEmpty();
        verify(ticketManager, atLeastOnce()).getTicketDownload(any());
    }

    @Test
    void testGetTicketDownloads_NonExistentOrder() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // When / Then
        assertThatThrownBy(() -> orderManager.getTicketDownloads(nonExistentId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Order not found");
    }
}

