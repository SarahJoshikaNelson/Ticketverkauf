package at.htlleonding.repositories;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.types.Order;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
@NoArgsConstructor
public class OrderRepo implements PanacheRepositoryBase<Order, UUID> {
    public List<Order> findUnconfirmedOrdersOlderThan(LocalDateTime cutoff) {
        return list("status = ?1 and orderDate < ?2", OrderStatus.WAITING, cutoff);
    }

    public boolean isSeatTaken(UUID seatId) {
        return count(
                "from Order o join o.seats s where s.id = ?1 and o.status != ?2",
                seatId, OrderStatus.CANCELLED) > 0;
    }

    /**
     * Find orders by customer last name (case-insensitive).
     * Used for bank statement matching.
     */
    public List<Order> findByCustomerLastName(String lastName) {
        return list("LOWER(customer.lastName) = LOWER(?1) AND status != ?2",
                lastName.trim(), OrderStatus.CANCELLED);
    }

    /**
     * Find all orders excluding cancelled ones.
     * Used for bulk mail operations.
     */
    public List<Order> findAllActive() {
        return list("status != ?1", OrderStatus.CANCELLED);
    }

    /**
     * Find orders by status list.
     * Used for bulk mail operations with status filtering.
     */
    public List<Order> findByStatuses(List<OrderStatus> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return findAllActive();
        }
        return list("status IN ?1", statuses);
    }

    /**
     * Check if there are any orders in the system.
     */
    public boolean hasAnyOrders() {
        return count() > 0;
    }
}
