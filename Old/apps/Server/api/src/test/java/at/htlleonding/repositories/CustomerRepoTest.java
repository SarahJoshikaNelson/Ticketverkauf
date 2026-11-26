package at.htlleonding.repositories;

import at.htlleonding.types.Customer;
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
class CustomerRepoTest {

    @Inject
    CustomerRepo customerRepo;

    private Customer testCustomer;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        customerRepo.deleteAll();

        // Create test customer
        testCustomer = new Customer();
        testCustomer.setId(UUID.randomUUID());
        testCustomer.setFirstName("John");
        testCustomer.setLastName("Doe");
        testCustomer.setMailAddress("john.doe@example.com");
        testCustomer.setPhoneNumber("1234567890");
        testCustomer.setMale(true);
        testCustomer.setStreet("Main Street");
        testCustomer.setStreetNumber("123");
        testCustomer.setZipCode("12345");
        testCustomer.setTown("TestCity");
        customerRepo.persist(testCustomer);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        customerRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistCustomer() {
        // Given
        Customer newCustomer = new Customer();
        newCustomer.setId(UUID.randomUUID());
        newCustomer.setFirstName("Jane");
        newCustomer.setLastName("Smith");
        newCustomer.setMailAddress("jane.smith@example.com");
        newCustomer.setPhoneNumber("9876543210");
        newCustomer.setMale(false);
        newCustomer.setStreet("Second Avenue");
        newCustomer.setStreetNumber("456");
        newCustomer.setZipCode("54321");
        newCustomer.setTown("AnotherCity");

        // When
        customerRepo.persist(newCustomer);

        // Then
        assertThat(newCustomer.getId()).isNotNull();
        Customer found = customerRepo.findById(newCustomer.getId());
        assertThat(found).isNotNull();
        assertThat(found.getFirstName()).isEqualTo("Jane");
        assertThat(found.getLastName()).isEqualTo("Smith");
        assertThat(found.getMailAddress()).isEqualTo("jane.smith@example.com");
    }

    @Test
    void testFindById() {
        // When
        Customer found = customerRepo.findById(testCustomer.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getFirstName()).isEqualTo("John");
        assertThat(found.getLastName()).isEqualTo("Doe");
        assertThat(found.getMailAddress()).isEqualTo("john.doe@example.com");
    }

    @Test
    void testFindByEmail() {
        // When
        Customer found = customerRepo.find("mailAddress", "john.doe@example.com").firstResult();

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getFirstName()).isEqualTo("John");
        assertThat(found.getPhoneNumber()).isEqualTo("1234567890");
    }

    @Test
    void testFindByName() {
        // When
        List<Customer> customers = customerRepo.find("firstName", "John").list();

        // Then
        assertThat(customers).isNotEmpty();
        assertThat(customers).hasSize(1);
        assertThat(customers.get(0).getLastName()).isEqualTo("Doe");
    }

    @Test
    void testListAll() {
        // When
        List<Customer> customers = customerRepo.listAll();

        // Then
        assertThat(customers).isNotEmpty();
        assertThat(customers).hasSize(1);
    }

    @Test
    @Transactional
    void testUpdateCustomer() {
        // Given
        Customer customer = customerRepo.findById(testCustomer.getId());

        // When
        customer.setPhoneNumber("5555555555");
        customer.setStreet("Updated Street");
        customerRepo.persist(customer);

        // Then
        Customer updated = customerRepo.findById(testCustomer.getId());
        assertThat(updated.getPhoneNumber()).isEqualTo("5555555555");
        assertThat(updated.getStreet()).isEqualTo("Updated Street");
    }

    @Test
    @Transactional
    void testDeleteCustomer() {
        // Given
        UUID customerId = testCustomer.getId();

        // When
        customerRepo.delete(testCustomer);

        // Then
        Customer deleted = customerRepo.findById(customerId);
        assertThat(deleted).isNull();
    }

    @Test
    void testCount() {
        // When
        long count = customerRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    @Transactional
    void testFindByGender() {
        // Given
        Customer femaleCustomer = new Customer();
        femaleCustomer.setId(UUID.randomUUID());
        femaleCustomer.setFirstName("Jane");
        femaleCustomer.setLastName("Doe");
        femaleCustomer.setMailAddress("jane@example.com");
        femaleCustomer.setPhoneNumber("1111111111");
        femaleCustomer.setMale(false);
        femaleCustomer.setStreet("Jane St");
        femaleCustomer.setStreetNumber("456");
        femaleCustomer.setZipCode("54321");
        femaleCustomer.setTown("JaneCity");
        customerRepo.persist(femaleCustomer);

        // When
        List<Customer> maleCustomers = customerRepo.find("isMale", true).list();
        List<Customer> femaleCustomers = customerRepo.find("isMale", false).list();

        // Then
        assertThat(maleCustomers).hasSize(1);
        assertThat(femaleCustomers).hasSize(1);
    }

    @Test
    void testFindByTown() {
        // When
        List<Customer> customers = customerRepo.find("town", "TestCity").list();

        // Then
        assertThat(customers).isNotEmpty();
        assertThat(customers).hasSize(1);
        assertThat(customers.get(0).getZipCode()).isEqualTo("12345");
    }

    @Test
    @Transactional
    void testPersistCustomerWithCompleteAddress() {
        // Given
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFirstName("Complete");
        customer.setLastName("Address");
        customer.setMailAddress("complete@example.com");
        customer.setPhoneNumber("7777777777");
        customer.setMale(true);
        customer.setStreet("Complete Street");
        customer.setStreetNumber("999");
        customer.setZipCode("99999");
        customer.setTown("CompleteCity");

        // When
        customerRepo.persist(customer);

        // Then
        Customer found = customerRepo.findById(customer.getId());
        assertThat(found.getStreet()).isEqualTo("Complete Street");
        assertThat(found.getStreetNumber()).isEqualTo("999");
        assertThat(found.getZipCode()).isEqualTo("99999");
        assertThat(found.getTown()).isEqualTo("CompleteCity");
    }
}

