package at.htlleonding.repositories;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.TicketType;
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
class TicketRepoTest {

    @Inject
    TicketRepo ticketRepo;

    @Inject
    OrderRepo orderRepo;

    @Inject
    CustomerRepo customerRepo;

    private Ticket testTicket;
    private Order testOrder;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        ticketRepo.deleteAll();
        orderRepo.deleteAll();
        customerRepo.deleteAll();

        // Create customer
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID()); // Set ID manually for Customer
        customer.setFirstName("Test");
        customer.setLastName("Customer");
        customer.setMailAddress("test@example.com");
        customer.setPhoneNumber("1234567890");
        customer.setMale(true);
        customer.setStreet("Test St");
        customer.setStreetNumber("123");
        customer.setZipCode("12345");
        customer.setTown("TestCity");
        customerRepo.persist(customer);

        // Create order
        testOrder = new Order();
        testOrder.setCustomer(customer);
        testOrder.setStatus(OrderStatus.WAITING);
        testOrder.setOrderDate(LocalDateTime.now());
        testOrder.setTickets(new HashSet<>());
        testOrder.setSeats(new ArrayList<>());
        orderRepo.persist(testOrder);

        // Create ticket
        testTicket = new Ticket(TicketType.STUDENT, testOrder, false);
        testTicket.setActivated(false);
        ticketRepo.persist(testTicket);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        ticketRepo.deleteAll();
        orderRepo.deleteAll();
        customerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistTicket() {
        // Given
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket newTicket = new Ticket(TicketType.GRADUATE, order, true);
        newTicket.setActivated(false);

        // When
        ticketRepo.persist(newTicket);

        // Then
        assertThat(newTicket.getId()).isNotNull();
        Ticket found = ticketRepo.findById(newTicket.getId());
        assertThat(found).isNotNull();
        assertThat(found.getTicketType()).isEqualTo(TicketType.GRADUATE);
        assertThat(found.isPhysical()).isTrue();
    }

    @Test
    void testFindById() {
        // When
        Ticket found = ticketRepo.findById(testTicket.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getTicketType()).isEqualTo(TicketType.STUDENT);
    }

    @Test
    void testListAll() {
        // When
        List<Ticket> tickets = ticketRepo.listAll();

        // Then
        assertThat(tickets).isNotEmpty();
        assertThat(tickets).hasSize(1);
    }

    @Test
    @Transactional
    void testUpdateTicket() {
        // Given
        Ticket ticket = ticketRepo.findById(testTicket.getId());

        // When
        ticket.setActivated(true);
        ticket.setPhysical(true);
        ticketRepo.persist(ticket);

        // Then
        Ticket updated = ticketRepo.findById(testTicket.getId());
        assertThat(updated.isActivated()).isTrue();
        assertThat(updated.isPhysical()).isTrue();
    }

    @Test
    @Transactional
    void testDeleteTicket() {
        // Given
        UUID ticketId = testTicket.getId();

        // When
        ticketRepo.delete(testTicket);

        // Then
        Ticket deleted = ticketRepo.findById(ticketId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testFindTicketsByOrder() {
        // Given - create another ticket for the same order
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket ticket2 = new Ticket(TicketType.GRADUATE, order, false);
        ticket2.setActivated(false);
        ticketRepo.persist(ticket2);

        // When
        List<Ticket> tickets = ticketRepo.find("order", order).list();

        // Then
        assertThat(tickets).hasSize(2);
    }

    @Test
    @Transactional
    void testFindTicketsByType() {
        // Given - create different types of tickets
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket graduateTicket = new Ticket(TicketType.GRADUATE, order, false);
        graduateTicket.setActivated(false);
        ticketRepo.persist(graduateTicket);

        // When
        List<Ticket> studentTickets = ticketRepo.find("ticketType", TicketType.STUDENT).list();
        List<Ticket> graduateTickets = ticketRepo.find("ticketType", TicketType.GRADUATE).list();

        // Then
        assertThat(studentTickets).hasSize(1);
        assertThat(graduateTickets).hasSize(1);
    }

    @Test
    @Transactional
    void testFindActivatedTickets() {
        // Given - create an activated ticket
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket activatedTicket = new Ticket(TicketType.STUDENT, order, false);
        activatedTicket.setActivated(true);
        ticketRepo.persist(activatedTicket);

        // When
        List<Ticket> activatedTickets = ticketRepo.find("isActivated", true).list();
        List<Ticket> nonActivatedTickets = ticketRepo.find("isActivated", false).list();

        // Then
        assertThat(activatedTickets).hasSize(1);
        assertThat(nonActivatedTickets).hasSize(1);
    }

    @Test
    @Transactional
    void testFindPhysicalTickets() {
        // Given - create a physical ticket
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket physicalTicket = new Ticket(TicketType.GRADUATE, order, true);
        physicalTicket.setActivated(false);
        ticketRepo.persist(physicalTicket);

        // When
        List<Ticket> physicalTickets = ticketRepo.find("isPhysical", true).list();
        List<Ticket> digitalTickets = ticketRepo.find("isPhysical", false).list();

        // Then
        assertThat(physicalTickets).hasSize(1);
        assertThat(digitalTickets).hasSize(1);
    }

    @Test
    void testCount() {
        // When
        long count = ticketRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    @Transactional
    void testPersistMultipleTickets() {
        // Given
        Order order = orderRepo.findById(testOrder.getId()); // Refetch order
        Ticket ticket2 = new Ticket(TicketType.GRADUATE, order, false);
        ticket2.setActivated(false);

        Ticket ticket3 = new Ticket(TicketType.EXTERNAL, order, true);
        ticket3.setActivated(true);

        // When
        ticketRepo.persist(ticket2);
        ticketRepo.persist(ticket3);

        // Then
        assertThat(ticketRepo.count()).isEqualTo(3);
    }
}

