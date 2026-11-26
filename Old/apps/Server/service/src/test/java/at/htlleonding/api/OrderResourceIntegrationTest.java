package at.htlleonding.api;

import at.htlleonding.OrderManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.CustomerRepo;
import at.htlleonding.repositories.OrderRepo;
import at.htlleonding.types.Customer;
import at.htlleonding.types.Order;
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
import java.util.UUID;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class OrderResourceIntegrationTest {

    @Inject
    OrderRepo orderRepo;

    @Inject
    CustomerRepo customerRepo;

    @Inject
    OrderManager orderManager;

    private Customer testCustomer;
    private Order testOrder;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up using native queries to ensure proper cleanup
        orderRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        orderRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        orderRepo.getEntityManager().flush();

        // Create test customer
        testCustomer = new Customer();
        testCustomer.setId(UUID.randomUUID());
        testCustomer.setFirstName("Integration");
        testCustomer.setLastName("Test");
        testCustomer.setMailAddress("integration@example.com");
        testCustomer.setPhoneNumber("1234567890");
        testCustomer.setMale(true);
        testCustomer.setStreet("Test St");
        testCustomer.setStreetNumber("1");
        testCustomer.setZipCode("12345");
        testCustomer.setTown("TestCity");
        customerRepo.persist(testCustomer);

        // Create test order
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
        // Clean up using native queries to ensure proper cleanup
        orderRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE \"order\" CASCADE").executeUpdate();
        orderRepo.getEntityManager().createNativeQuery("TRUNCATE TABLE customer CASCADE").executeUpdate();
        orderRepo.getEntityManager().flush();
    }

    @Test
    void testGetOrderById() {
        // Note: This test assumes there's a GET endpoint for orders
        // If not, this is a placeholder for when you implement it
        
        // The order exists in the database
        Order found = orderRepo.findById(testOrder.getId());
        assert found != null;
        assert found.getCustomer().getMailAddress().equals("integration@example.com");
    }

    @Test
    @Transactional
    void testOrderLifecycle() {
        // Test the full order lifecycle through the manager
        
        // 1. Order starts as WAITING
        Order order = orderRepo.findById(testOrder.getId());
        assert order.getStatus() == OrderStatus.WAITING;

        // 2. Toggle to CONFIRMED
        orderManager.toggleOrderStatus(testOrder.getId(), OrderStatus.CONFIRMED);
        order = orderRepo.findById(testOrder.getId());
        assert order.getStatus() == OrderStatus.CONFIRMED;

        // 3. Toggle to PAID
        orderManager.toggleOrderStatus(testOrder.getId(), OrderStatus.PAID);
        order = orderRepo.findById(testOrder.getId());
        assert order.getStatus() == OrderStatus.PAID;
        assert order.getInvoiceNumber() != null;
    }

    @Test
    @Transactional
    void testGetOrdersByCustomerEmail() {
        // Given - create another order
        Order order2 = new Order();
        order2.setCustomer(testCustomer);
        order2.setStatus(OrderStatus.CONFIRMED);
        order2.setOrderDate(LocalDateTime.now());
        order2.setTickets(new HashSet<>());
        order2.setSeats(new ArrayList<>());
        orderRepo.persist(order2);

        // When
        Order[] orders = orderManager.getOrders("integration@example.com");

        // Then
        assert orders.length == 2;
    }

    @Test
    @Transactional
    void testCancelOrder() {
        // When
        orderManager.toggleOrderStatus(testOrder.getId(), OrderStatus.CANCELLED);

        // Then
        Order cancelled = orderRepo.findById(testOrder.getId());
        assert cancelled.getStatus() == OrderStatus.CANCELLED;
    }

    @Test
    @Transactional
    void testMultipleOrdersForDifferentCustomers() {
        // Given - create another customer and order
        Customer customer2 = new Customer();
        customer2.setId(UUID.randomUUID());
        customer2.setFirstName("Second");
        customer2.setLastName("Customer");
        customer2.setMailAddress("second@example.com");
        customer2.setPhoneNumber("9876543210");
        customer2.setMale(false);
        customer2.setStreet("Second Street");
        customer2.setStreetNumber("2");
        customer2.setZipCode("54321");
        customer2.setTown("TestTown");
        customerRepo.persist(customer2);

        Order order2 = new Order();
        order2.setCustomer(customer2);
        order2.setStatus(OrderStatus.WAITING);
        order2.setOrderDate(LocalDateTime.now());
        order2.setTickets(new HashSet<>());
        order2.setSeats(new ArrayList<>());
        orderRepo.persist(order2);

        // When
        Order[] orders1 = orderManager.getOrders("integration@example.com");
        Order[] orders2 = orderManager.getOrders("second@example.com");

        // Then
        assert orders1.length == 1;
        assert orders2.length == 1;
        assert !orders1[0].getId().equals(orders2[0].getId());
    }
}

