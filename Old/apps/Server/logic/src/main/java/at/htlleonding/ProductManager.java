package at.htlleonding;

import at.htlleonding.repositories.OrderCacheRepo;
import at.htlleonding.repositories.ProductOrderRepo;
import at.htlleonding.repositories.ProductRepo;
import at.htlleonding.repositories.SettingRepo;
import at.htlleonding.repositories.TicketUpgradeRepo;
import at.htlleonding.repositories.TicketRepo;
import at.htlleonding.types.*;
import at.htlleonding.types.dtos.CompletedOrderItemDTO;
import at.htlleonding.types.dtos.DigitalTicketDTO;
import at.htlleonding.types.dtos.ProductDTO;
import at.htlleonding.types.dtos.ProductOrderDTO;
import at.htlleonding.types.dtos.ShopOrderMailDTO;
import at.htlleonding.types.dtos.ShopCheckoutRequestDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import at.htlleonding.enums.TicketType;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class ProductManager {
    private ProductRepo productRepo;
    private ProductOrderRepo productOrderRepo;
    private TicketUpgradeRepo ticketUpgradeRepo;
    private TicketRepo ticketRepo;
    private OrderCacheRepo orderCacheRepo;
    private UserManager userManager;
    private TicketManager ticketManager;
    private MailManager mailManager;
    private SettingRepo settingRepo;

    private static final String SHOP_MAIL_ENABLED_KEY = "ShopMailEnabled";

    private boolean isShopMailEnabled() {
        var setting = settingRepo.findById(SHOP_MAIL_ENABLED_KEY);
        return setting != null && setting.getValue() == 1.0;
    }

    @Transactional
    public List<ProductDTO> getAllProducts() {
        return productRepo.listAll().stream()
                .map(p -> new ProductDTO(p.getId(), p.getTitle(), p.getDescription(), p.getImageUrl(), p.getStock(), p.getPrice()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductDTO getProduct(Long id) {
        Product p = productRepo.findById(id);
        if (p == null) return null;
        return new ProductDTO(p.getId(), p.getTitle(), p.getDescription(), p.getImageUrl(), p.getStock(), p.getPrice());
    }

    @Transactional
    public void createOrUpdateProduct(ProductDTO dto) {
        Product p;
        if (dto.id() != null) {
            p = productRepo.findById(dto.id());
        } else {
            p = new Product();
        }
        p.setTitle(dto.title());
        p.setDescription(dto.description());
        p.setImageUrl(dto.imageUrl());
        p.setStock(dto.stock());
        p.setPrice(dto.price());
        productRepo.persist(p);
    }

    @Transactional
    public void deleteProduct(Long id) {
        productRepo.deleteById(id);
    }

    @Transactional
    public void orderProduct(Long productId, String email, int quantity) {
        Product p = productRepo.findById(productId);
        if (p == null) throw new IllegalArgumentException("Produkt nicht gefunden.");
        User u = userManager.getUser(email);
        if (u == null) throw new IllegalArgumentException("Benutzer nicht gefunden.");
        if (p.getStock() < quantity) {
            throw new IllegalStateException(
                "Nicht genügend Lagerbestand für \"" + p.getTitle() + "\". Verfügbar: " + p.getStock() + ", angefragt: " + quantity + "."
            );
        }
        p.setStock(p.getStock() - quantity);
        ProductOrder order = new ProductOrder();
        order.setProduct(p);
        order.setUser(u);
        order.setQuantity(quantity);
        order.setOrderedAt(LocalDateTime.now());
        productOrderRepo.persist(order);
        productRepo.persist(p);
    }

    @Transactional
    public void bulkOrder(List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items, String email) {
        User u = userManager.getUser(email);
        if (u == null) throw new IllegalArgumentException("Benutzer nicht gefunden.");

        // Validate all items before processing any — fail fast with a clear message
        for (var item : items) {
            Product p = productRepo.findById(item.productId());
            if (p == null) throw new IllegalArgumentException("Produkt mit ID " + item.productId() + " nicht gefunden.");
            if (p.getStock() < item.quantity()) {
                throw new IllegalStateException(
                    "Nicht genügend Lagerbestand für \"" + p.getTitle() + "\". Verfügbar: " + p.getStock() + ", angefragt: " + item.quantity() + "."
                );
            }
        }

        List<ShopOrderMailDTO.LineDTO> mailLines = new java.util.ArrayList<>();
        for (var item : items) {
            Product p = productRepo.findById(item.productId());
            p.setStock(p.getStock() - item.quantity());
            ProductOrder order = new ProductOrder();
            order.setProduct(p);
            order.setUser(u);
            order.setQuantity(item.quantity());
            order.setOrderedAt(LocalDateTime.now());
            productOrderRepo.persist(order);
            productRepo.persist(p);
            mailLines.add(new ShopOrderMailDTO.LineDTO(p.getTitle(), item.quantity(), p.getPrice()));
        }

        if (isShopMailEnabled()) {
            double total = mailLines.stream().mapToDouble(l -> l.quantity() * l.unitPrice()).sum();
            var dto = new ShopOrderMailDTO(email, u.getUsername(), mailLines, total, false);
            mailManager.sendShopOrderMail(dto);
        }
    }

    @Transactional
    public List<ProductOrderDTO> getUserOrders(String email) {
        User u = userManager.getUser(email);
        if (u == null) return List.of();
        return productOrderRepo.find("user", u).stream()
                .map(o -> new ProductOrderDTO(o.getId(), o.getProduct().getId(), o.getProduct().getTitle(), o.getUser().getUsername(), o.getQuantity(), o.getOrderedAt(), o.getQuantity() * o.getProduct().getPrice()))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CompletedOrderItemDTO> getUserCompletedOrders(String email) {
        User u = userManager.getUser(email);
        List<CompletedOrderItemDTO> result = new ArrayList<>();

        if (u != null) {
            for (ProductOrder o : productOrderRepo.find("user", u).list()) {
                result.add(new CompletedOrderItemDTO(
                        CompletedOrderItemDTO.TYPE_PRODUCT,
                        o.getId(),
                        o.getProduct().getTitle(),
                        o.getQuantity(),
                        o.getOrderedAt(),
                        o.getQuantity() * o.getProduct().getPrice()
                ));
            }
        }

        for (TicketUpgrade tu : ticketUpgradeRepo.listAll()) {
            Order order = tu.getTicket().getOrder();
            boolean ownedByUser = u != null && order.getUser() != null && order.getUser().getId().equals(u.getId());
            boolean ownedByCustomer = order.getCustomer() != null
                    && order.getCustomer().getMailAddress().equalsIgnoreCase(email);
            if (ownedByUser || ownedByCustomer) {
                result.add(new CompletedOrderItemDTO(
                        CompletedOrderItemDTO.TYPE_UPGRADE,
                        tu.getId(),
                        "Ticket-Upgrade: " + tu.getTicket().getTicketType(),
                        1,
                        tu.getUpgradedAt(),
                        tu.getPrice()
                ));
            }
        }

        result.sort(Comparator.comparing(CompletedOrderItemDTO::orderedAt).reversed());
        return result;
    }

    @Transactional
    public List<ProductOrderDTO> getAllOrders() {
        return productOrderRepo.listAll().stream()
                .map(o -> new ProductOrderDTO(o.getId(), o.getProduct().getId(), o.getProduct().getTitle(), o.getUser().getUsername(), o.getQuantity(), o.getOrderedAt(), o.getQuantity() * o.getProduct().getPrice()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void upgradeTicket(UUID ticketId, String email) {
        Ticket t = ticketRepo.findById(ticketId);
        if (t == null) throw new IllegalArgumentException("Ticket nicht gefunden.");
        if (t.isPhysical()) throw new IllegalStateException("Dieses Ticket wurde bereits upgradet.");

        Order order = t.getOrder();
        User u = userManager.getUser(email);

        boolean ownedByUser = u != null && order.getUser() != null && order.getUser().getId().equals(u.getId());
        boolean ownedByCustomer = order.getCustomer() != null
                && order.getCustomer().getMailAddress().equalsIgnoreCase(email);

        if (!ownedByUser && !ownedByCustomer) {
            throw new IllegalStateException("Sie sind nicht berechtigt, dieses Ticket upzugraden.");
        }

        double price = ticketManager.getAdditionalChargeForPhysicalTicket();
        t.setPhysical(true);
        TicketUpgrade upgrade = new TicketUpgrade();
        upgrade.setTicket(t);
        upgrade.setUpgradedAt(LocalDateTime.now());
        upgrade.setPrice(price);
        ticketUpgradeRepo.persist(upgrade);
        ticketRepo.persist(t);

        if (isShopMailEnabled()) {
            String name = u != null ? u.getUsername()
                    : (order.getCustomer() != null ? order.getCustomer().getFirstName() : email);
            var line = new ShopOrderMailDTO.LineDTO("Ticket-Upgrade: " + t.getTicketType(), 1, price);
            var dto = new ShopOrderMailDTO(email, name, List.of(line), price, true);
            mailManager.sendShopOrderMail(dto);
        }
    }

    @Transactional
    public List<DigitalTicketDTO> getUserDigitalTickets(String email) {
        User u = userManager.getUser(email);
        return ticketRepo.find("isPhysical", false).stream()
                .filter(t -> {
                    Order order = t.getOrder();
                    if (order == null) return false;
                    // Match via User entity (shop / non-student logins)
                    if (u != null && order.getUser() != null && order.getUser().getId().equals(u.getId())) return true;
                    // Match via Customer entity (original ticket-booking system)
                    return order.getCustomer() != null && order.getCustomer().getMailAddress().equalsIgnoreCase(email);
                })
                .map(t -> new DigitalTicketDTO(t.getId().toString(), t.getTicketType().toString()))
                .collect(Collectors.toList());
    }

    /** Count of upgradeable (digital) tickets per ticket type for the user. */
    @Transactional
    public Map<TicketType, Long> getUpgradeableCountsByType(String email) {
        List<DigitalTicketDTO> all = getUserDigitalTickets(email);
        Map<TicketType, Long> counts = new EnumMap<>(TicketType.class);
        for (TicketType tt : TicketType.values()) {
            counts.put(tt, 0L);
        }
        for (DigitalTicketDTO d : all) {
            try {
                TicketType tt = TicketType.valueOf(d.ticketType());
                counts.merge(tt, 1L, Long::sum);
            } catch (IllegalArgumentException ignored) { }
        }
        return counts;
    }

    /**
     * Validates stock availability and decrements it atomically using pessimistic locking.
     * Call this BEFORE creating a Stripe checkout session to prevent overselling.
     */
    @Transactional
    public void reserveProductStock(List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items) {
        if (items == null || items.isEmpty()) return;
        for (var item : items) {
            Product p = productRepo.getEntityManager()
                    .find(Product.class, item.productId(), LockModeType.PESSIMISTIC_WRITE);
            if (p == null)
                throw new IllegalArgumentException("Produkt mit ID " + item.productId() + " nicht gefunden.");
            if (p.getStock() < item.quantity()) {
                throw new IllegalStateException(
                        "Nicht genügend Lagerbestand für \"" + p.getTitle()
                                + "\". Verfügbar: " + p.getStock() + ", angefragt: " + item.quantity() + ".");
            }
            p.setStock(p.getStock() - item.quantity());
        }
    }

    /**
     * Restores previously reserved stock (e.g. after Stripe session expires or creation fails).
     */
    @Transactional
    public void restoreProductStock(List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items) {
        if (items == null || items.isEmpty()) return;
        for (var item : items) {
            Product p = productRepo.findById(item.productId());
            if (p != null) {
                p.setStock(p.getStock() + item.quantity());
            }
        }
    }

    /**
     * Creates ProductOrder records only — stock must already be decremented via reserveProductStock.
     */
    @Transactional
    public void createProductOrders(List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items, String email) {
        if (items == null || items.isEmpty()) return;
        User u = userManager.getUser(email);
        if (u == null) throw new IllegalArgumentException("Benutzer nicht gefunden.");

        List<ShopOrderMailDTO.LineDTO> mailLines = new ArrayList<>();
        for (var item : items) {
            Product p = productRepo.findById(item.productId());
            ProductOrder order = new ProductOrder();
            order.setProduct(p);
            order.setUser(u);
            order.setQuantity(item.quantity());
            order.setOrderedAt(LocalDateTime.now());
            productOrderRepo.persist(order);
            mailLines.add(new ShopOrderMailDTO.LineDTO(p.getTitle(), item.quantity(), p.getPrice()));
        }

        if (isShopMailEnabled()) {
            double total = mailLines.stream().mapToDouble(l -> l.quantity() * l.unitPrice()).sum();
            var dto = new ShopOrderMailDTO(email, u.getUsername(), mailLines, total, false);
            mailManager.sendShopOrderMail(dto);
        }
    }

    /**
     * Reserves upgrade tickets by marking them as physical with pessimistic locking.
     * Returns the list of ticket IDs that were reserved.
     */
    @Transactional
    public List<String> reserveUpgradeTickets(String email, TicketType ticketType, int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Menge muss mindestens 1 sein.");
        List<DigitalTicketDTO> candidates = getUserDigitalTickets(email).stream()
                .filter(d -> ticketType.name().equals(d.ticketType()))
                .toList();
        if (candidates.size() < quantity) {
            throw new IllegalStateException(
                    "Nicht genügend digitale Tickets vom Typ \"" + ticketType
                            + "\" verfügbar. Verfügbar: " + candidates.size() + ", angefragt: " + quantity + ".");
        }

        List<String> ids = new ArrayList<>();
        int reserved = 0;
        for (var candidate : candidates) {
            if (reserved >= quantity) break;
            UUID ticketId = UUID.fromString(candidate.id());
            Ticket t = ticketRepo.getEntityManager()
                    .find(Ticket.class, ticketId, LockModeType.PESSIMISTIC_WRITE);
            if (t == null || t.isPhysical()) continue;
            t.setPhysical(true);
            ids.add(ticketId.toString());
            reserved++;
        }

        if (reserved < quantity) {
            throw new IllegalStateException(
                    "Nicht genügend digitale Tickets vom Typ \"" + ticketType + "\" verfügbar.");
        }
        return ids;
    }

    /**
     * Reverts previously reserved upgrade tickets back to digital.
     */
    @Transactional
    public void restoreUpgradeTickets(List<String> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) return;
        for (String id : ticketIds) {
            Ticket t = ticketRepo.findById(UUID.fromString(id));
            if (t != null && t.isPhysical()) {
                t.setPhysical(false);
            }
        }
    }

    /**
     * Creates TicketUpgrade records only — tickets must already be marked physical via reserveUpgradeTickets.
     */
    @Transactional
    public void createUpgradeRecords(List<String> ticketIds, String email) {
        if (ticketIds == null || ticketIds.isEmpty()) return;
        double price = ticketManager.getAdditionalChargeForPhysicalTicket();
        for (String id : ticketIds) {
            Ticket t = ticketRepo.findById(UUID.fromString(id));
            TicketUpgrade upgrade = new TicketUpgrade();
            upgrade.setTicket(t);
            upgrade.setUpgradedAt(LocalDateTime.now());
            upgrade.setPrice(price);
            ticketUpgradeRepo.persist(upgrade);
        }

        if (isShopMailEnabled()) {
            User u = userManager.getUser(email);
            String name = u != null ? u.getUsername() : email;
            var line = new ShopOrderMailDTO.LineDTO("Ticket-Upgrade", ticketIds.size(), price);
            var dto = new ShopOrderMailDTO(email, name, List.of(line), ticketIds.size() * price, true);
            mailManager.sendShopOrderMail(dto);
        }
    }

    @Transactional
    public OrderCache persistShopOrderCache(ShopCheckoutRequestDTO dto) {
        OrderCache orderCache = new OrderCache(dto.toJson());
        orderCacheRepo.persist(orderCache);
        orderCacheRepo.flush();
        return orderCache;
    }

    /**
     * Fulfills a paid shop order. If reservedTicketIds is present (new flow), creates records only
     * since stock/upgrades were already reserved. Falls back to the old flow for pre-existing orders.
     */
    @Transactional
    public void fulfillPaidShopOrder(ShopCheckoutRequestDTO cart) {
        List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items = cart.items() != null
                ? cart.items().stream()
                    .map(i -> new at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO(i.productId(), i.quantity()))
                    .collect(Collectors.toList())
                : List.of();

        if (cart.reservedTicketIds() != null) {
            createProductOrders(items, cart.email());
            createUpgradeRecords(cart.reservedTicketIds(), cart.email());
        } else {
            List<at.htlleonding.types.dtos.UpgradeByTypeRequestDTO> upgrades = cart.upgrades() != null
                    ? cart.upgrades().stream()
                        .map(u -> new at.htlleonding.types.dtos.UpgradeByTypeRequestDTO(u.ticketType(), u.quantity()))
                        .collect(Collectors.toList())
                    : List.of();
            fulfillShopOrder(cart.email(), items, upgrades);
        }
    }

    /**
     * Restores all reservations made during checkout session creation (for expiry/cancellation).
     */
    @Transactional
    public void undoShopReservation(ShopCheckoutRequestDTO cart) {
        if (cart.items() != null && !cart.items().isEmpty()) {
            List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items = cart.items().stream()
                    .map(i -> new at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO(i.productId(), i.quantity()))
                    .collect(Collectors.toList());
            restoreProductStock(items);
        }
        restoreUpgradeTickets(cart.reservedTicketIds());
    }

    @Transactional
    public void fulfillShopOrder(
            String email,
            List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> items,
            List<at.htlleonding.types.dtos.UpgradeByTypeRequestDTO> upgrades) {
        if (items != null && !items.isEmpty()) {
            bulkOrder(items, email);
        }
        if (upgrades != null) {
            for (var u : upgrades) {
                TicketType tt = TicketType.valueOf(u.ticketType().toUpperCase());
                upgradeTicketsByType(email, tt, u.quantity());
            }
        }
    }

    /** Upgrade up to `quantity` digital tickets of the given type for the user. */
    @Transactional
    public void upgradeTicketsByType(String email, TicketType ticketType, int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Menge muss mindestens 1 sein.");
        List<DigitalTicketDTO> candidates = getUserDigitalTickets(email).stream()
                .filter(d -> ticketType.name().equals(d.ticketType()))
                .toList();
        if (candidates.size() < quantity) {
            throw new IllegalStateException(
                "Nicht genügend digitale Tickets vom Typ \"" + ticketType + "\" verfügbar. Verfügbar: " + candidates.size() + ", angefragt: " + quantity + "."
            );
        }
        for (int i = 0; i < quantity; i++) {
            upgradeTicket(UUID.fromString(candidates.get(i).id()), email);
        }
    }
}
