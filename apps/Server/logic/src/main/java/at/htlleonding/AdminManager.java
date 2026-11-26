package at.htlleonding;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.enums.OrderGroupBy;
import at.htlleonding.enums.OrderSortField;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.SortDirection;
import at.htlleonding.enums.TicketType;
import at.htlleonding.repositories.*;
import at.htlleonding.types.*;
import at.htlleonding.types.dtos.*;
import at.htlleonding.types.dtos.admin.GroupedOrdersDTO;
import at.htlleonding.types.dtos.admin.OrderDTO;
import at.htlleonding.types.dtos.admin.OrderDetailDTO;
import at.htlleonding.types.dtos.admin.OrderGroupDTO;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import at.htlleonding.types.dtos.admin.MailConfigDTO;
import at.htlleonding.types.MailConfig;
import at.htlleonding.types.dtos.admin.PaginatedOrdersDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {
        @Inject })
@NoArgsConstructor
public class AdminManager {

    private EntityManager em;
    private PDFManager pdfManager;
    private MailManager mailService;
    private OrderRepo repo;
    private CustomerRepo customerRepo;
    private SeatRepo seatRepo;
    private OrderRepo orderRepo;
    private TicketRepo ticketRepo;
    private SecurityAdminRepo securityAdminRepo;
    private AdminRepo adminRepo;
    private DataManager dataManager;
    private TicketManager ticketManager;
    private MailConfigRepo mailConfigRepo;
    private EncryptionManager encryptionManager;
    private io.vertx.core.Vertx vertx;

    private static final String EXTERN_STRING = " - Extern";

    public List<Admin> getAllAdmins() {
        return adminRepo.listAll();
    }

    private OrderDetailDTO mapToOrderDetailDto(Order order) {
        Customer customer = order.getCustomer();
        List<Seat> seats = order.getSeats();
        List<Ticket> tickets = new ArrayList<>(order.getTickets());

        CustomerDTO customer1 = new CustomerDTO(customer.getFirstName(), customer.getLastName(),
                customer.getMailAddress(),
                customer.getPhoneNumber(), customer.getSchoolClass(), customer.isMale(), customer.getStreet(),
                customer.getStreetNumber(), customer.getZipCode(), customer.getTown());

        List<SeatDTO> seatDTOS = seats.stream()
                .map(seat -> new SeatDTO(seat.getId(), seat.getXPosition(), seat.getYPosition(), seat.getXLength(),
                        seat.getYLength(), seat.getPrice(), seat.getOrder() != null, seat.getTableName()))
                .collect(Collectors.toCollection(ArrayList::new));

        List<TicketDTO> ticketDTOS = tickets.stream()
                .map(ticket -> new TicketDTO(ticket.getTicketType(), ticket.getId(), ticket.isPhysical()))
                .collect(Collectors.toCollection(ArrayList::new));

        seatRepo.persist(seats);

        OrderDTO orderDTO = new OrderDTO(order.getStatus(), order.getOrderDate(), ticketDTOS, seatDTOS,
                ticketManager.getAdditionalChargeForPhysicalTicket());

        return new OrderDetailDTO(order.getId(), customer1, orderDTO, order.getInvoiceNumber());
    }

    private OrderMailDTO mapToOrderMailDto(Order order) {
        Customer customer = order.getCustomer();
        List<Seat> seats = order.getSeats();
        List<Ticket> tickets = order.getTickets().stream().collect(Collectors.toCollection(ArrayList::new));

        CustomerDTO customer1 = new CustomerDTO(customer.getFirstName(), customer.getLastName(),
                customer.getMailAddress(),
                customer.getPhoneNumber(), customer.getSchoolClass(), customer.isMale(), customer.getStreet(),
                customer.getStreetNumber(), customer.getZipCode(), customer.getTown());

        List<SeatDTO> seatDTOS = seats.stream()
                .map(seat -> new SeatDTO(seat.getId(), seat.getXPosition(), seat.getYPosition(), seat.getXLength(),
                        seat.getYLength(), seat.getPrice(), seat.getOrder() != null, seat.getTableName()))
                .collect(Collectors.toCollection(ArrayList::new));

        List<TicketDTO> ticketDTOS = tickets.stream()
                .map(ticket -> new TicketDTO(ticket.getTicketType(), ticket.getId(), ticket.isPhysical()))
                .collect(Collectors.toCollection(ArrayList::new));

        OrderDTO orderDTO = new OrderDTO(order.getStatus(), order.getOrderDate(), ticketDTOS, seatDTOS,
                ticketManager.getAdditionalChargeForPhysicalTicket());

        // Convert Data entity to lightweight DataDTO (without images)
        Data eventData = dataManager.getData();
        DataDTO eventDataDTO = new DataDTO();
        eventDataDTO.setTitle(eventData.getTitle());
        eventDataDTO.setSubTitle(eventData.getSubTitle());
        eventDataDTO.setDate(eventData.getOnDate());
        eventDataDTO.setOnDate(eventData.getOnDate()); // Set both for compatibility
        eventDataDTO.setPaymentInfo(eventData.getPaymentInfo());
        eventDataDTO.setPaymentText(eventData.getPaymentText());
        eventDataDTO.setGifUrl(eventData.getGifUrl());
        eventDataDTO.setOrganizationName(eventData.getOrganizationName());
        eventDataDTO.setOrganizationAddress(eventData.getOrganizationAddress());
        eventDataDTO.setFooterText(eventData.getFooterText());
        eventDataDTO.setContactEmail(eventData.getContactEmail());
        eventDataDTO.setContactPhone(eventData.getContactPhone());
        eventDataDTO.setContactWebsite(eventData.getContactWebsite());
        eventDataDTO.setPhysicalPickupInfo(eventData.getPhysicalPickupInfo());

        return new OrderMailDTO(order.getId(), customer1, orderDTO, eventDataDTO, order.getInvoiceNumber());
    }

    private String buildOrderByClause(OrderSortField sortField, SortDirection sortDirection) {
        String dir = sortDirection.name();
        return switch (sortField) {
            case DATE ->
                " ORDER BY o.orderDate " + dir;
            case USER_NAME ->
                " ORDER BY c.firstName " + dir + ", c.lastName " + dir;
            case TICKETS ->
                " ORDER BY SIZE(o.tickets) " + dir;
            case PRICING ->
                " ORDER BY SIZE(o.tickets) " + dir;
            case TABLES ->
                " ORDER BY SIZE(o.seats) " + dir;
        };
    }

    public PaginatedOrdersDTO getOrderOverview(int offset, int limit, OrderSortField sortField,
            SortDirection sortDirection) {
        String baseQuery = "FROM Order o LEFT JOIN o.customer c";
        String query = "SELECT o " + baseQuery + buildOrderByClause(sortField, sortDirection);
        List<Order> orders = em.createQuery(query, Order.class)
                .setFirstResult(offset * limit)
                .setMaxResults(limit)
                .getResultList();

        long totalCount = em.createQuery("SELECT COUNT(o) " + baseQuery, Long.class).getSingleResult();

        return new PaginatedOrdersDTO(
                orders.stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new)),
                totalCount);
    }

    public PaginatedOrdersDTO getOrderOverview(OrderStatus status, int offset, int limit, OrderSortField sortField,
            SortDirection sortDirection) {
        OrderStatus status2 = status == OrderStatus.ACTIVE ? OrderStatus.PAID : status;
        status = status == OrderStatus.ACTIVE ? OrderStatus.CONFIRMED : status;

        String baseQuery = "FROM Order o LEFT JOIN o.customer c WHERE o.status = ?1 OR o.status = ?2";
        String query = "SELECT o " + baseQuery + buildOrderByClause(sortField, sortDirection);

        List<Order> orders = em.createQuery(query, Order.class)
                .setParameter(1, status)
                .setParameter(2, status2)
                .setFirstResult(offset * limit)
                .setMaxResults(limit)
                .getResultList();

        long totalCount = em.createQuery("SELECT COUNT(o) " + baseQuery, Long.class)
                .setParameter(1, status)
                .setParameter(2, status2)
                .getSingleResult();

        return new PaginatedOrdersDTO(
                orders.stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new)),
                totalCount);
    }

    public PaginatedOrdersDTO getOrderOverview(String term, int offset, int limit, OrderSortField sortField,
            SortDirection sortDirection) {
        log.info("Searching orders with term '{}'", term);
        String baseQuery = """
                FROM Order o JOIN o.customer c
                WHERE (
                    LOWER(c.firstName) LIKE ?1
                    OR LOWER(c.lastName) LIKE ?1
                    OR (LOWER(c.firstName) || ' ' || LOWER(c.lastName)) LIKE ?1
                    OR EXISTS (SELECT t FROM Ticket t WHERE t.order = o AND ('#' || LOWER(CAST(t.id AS string))) LIKE ?1)
                    OR ('#' || LOWER(CAST(o.id AS string))) LIKE ?1
                    OR c.mailAddress LIKE ?1 OR c.phoneNumber LIKE ?1
                    OR CAST(FUNCTION('TO_CHAR', o.orderDate, 'DD.MM.YYYY') AS string) LIKE ?1
                )
                """;
        String query = "SELECT o " + baseQuery + buildOrderByClause(sortField, sortDirection);

        List<Order> orders = em.createQuery(query, Order.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .setFirstResult(offset * limit)
                .setMaxResults(limit)
                .getResultList();

        long totalCount = em.createQuery("SELECT COUNT(o) " + baseQuery, Long.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .getSingleResult();

        return new PaginatedOrdersDTO(
                orders.stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new)),
                totalCount);
    }

    public PaginatedOrdersDTO getOrderOverview(String term, OrderStatus status, int limit, int offset,
            OrderSortField sortField, SortDirection sortDirection) {
        log.info("Searching orders with term '{}' and status '{}'", term, status);
        String baseQuery = """
                FROM Order o JOIN o.customer c
                WHERE (
                    LOWER(c.firstName) LIKE ?1
                    OR LOWER(c.lastName) LIKE ?1
                    OR (LOWER(c.firstName) || ' ' || LOWER(c.lastName)) LIKE ?1
                    OR EXISTS (SELECT t FROM Ticket t WHERE t.order = o AND ('#' || LOWER(CAST(t.id AS string))) LIKE ?1)
                    OR ('#' || LOWER(CAST(o.id AS string))) LIKE ?1
                    OR c.mailAddress LIKE ?1 OR c.phoneNumber LIKE ?1
                    OR CAST(FUNCTION('TO_CHAR', o.orderDate, 'DD.MM.YYYY') AS string) LIKE ?1
                )
                AND ((o.status = ?2 OR o.status = ?3))
                """;
        String query = "SELECT o " + baseQuery + buildOrderByClause(sortField, sortDirection);

        OrderStatus status2 = status == OrderStatus.ACTIVE ? OrderStatus.PAID : status;
        status = status == OrderStatus.ACTIVE ? OrderStatus.CONFIRMED : status;

        List<Order> orders = em.createQuery(query, Order.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .setParameter(2, status)
                .setParameter(3, status2)
                .setFirstResult(offset * limit)
                .setMaxResults(limit)
                .getResultList();

        long totalCount = em.createQuery("SELECT COUNT(o) " + baseQuery, Long.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .setParameter(2, status)
                .setParameter(3, status2)
                .getSingleResult();

        return new PaginatedOrdersDTO(
                orders.stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new)),
                totalCount);
    }

    // === Grouping logic ===
    private static final List<OrderStatus> STATUS_ORDER = List.of(
            OrderStatus.DONE, OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.WAITING, OrderStatus.CANCELLED);

    private static final DateTimeFormatter DAY_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.GERMAN);

    // Unpaginated fetches for grouped overview — must load ALL matching orders
    // so groups are complete and group sorting is correct.
    private List<OrderDetailDTO> getAllOrders(OrderSortField sortField, SortDirection sortDirection) {
        String query = "SELECT o FROM Order o LEFT JOIN o.customer c" + buildOrderByClause(sortField, sortDirection);
        return em.createQuery(query, Order.class).getResultList()
                .stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new));
    }

    private List<OrderDetailDTO> getAllOrders(OrderStatus status, OrderSortField sortField,
            SortDirection sortDirection) {
        OrderStatus status2 = status == OrderStatus.ACTIVE ? OrderStatus.PAID : status;
        status = status == OrderStatus.ACTIVE ? OrderStatus.CONFIRMED : status;
        String query = "SELECT o FROM Order o LEFT JOIN o.customer c WHERE o.status = ?1 OR o.status = ?2"
                + buildOrderByClause(sortField, sortDirection);
        return em.createQuery(query, Order.class)
                .setParameter(1, status).setParameter(2, status2)
                .getResultList()
                .stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new));
    }

    private List<OrderDetailDTO> getAllOrders(String term, OrderSortField sortField, SortDirection sortDirection) {
        String query = """
                SELECT o FROM Order o JOIN o.customer c
                WHERE (
                    LOWER(c.firstName) LIKE ?1
                    OR LOWER(c.lastName) LIKE ?1
                    OR (LOWER(c.firstName) || ' ' || LOWER(c.lastName)) LIKE ?1
                    OR EXISTS (SELECT t FROM Ticket t WHERE t.order = o AND ('#' || LOWER(CAST(t.id AS string))) LIKE ?1)
                    OR ('#' || LOWER(CAST(o.id AS string))) LIKE ?1
                    OR c.mailAddress LIKE ?1 OR c.phoneNumber LIKE ?1
                    OR CAST(FUNCTION('TO_CHAR', o.orderDate, 'DD.MM.YYYY') AS string) LIKE ?1
                )
                """
                + buildOrderByClause(sortField, sortDirection);
        return em.createQuery(query, Order.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .getResultList()
                .stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new));
    }

    private List<OrderDetailDTO> getAllOrders(String term, OrderStatus status, OrderSortField sortField,
            SortDirection sortDirection) {
        String query = """
                SELECT o FROM Order o JOIN o.customer c
                WHERE (
                    LOWER(c.firstName) LIKE ?1
                    OR LOWER(c.lastName) LIKE ?1
                    OR (LOWER(c.firstName) || ' ' || LOWER(c.lastName)) LIKE ?1
                    OR EXISTS (SELECT t FROM Ticket t WHERE t.order = o AND ('#' || LOWER(CAST(t.id AS string))) LIKE ?1)
                    OR ('#' || LOWER(CAST(o.id AS string))) LIKE ?1
                    OR c.mailAddress LIKE ?1 OR c.phoneNumber LIKE ?1
                    OR CAST(FUNCTION('TO_CHAR', o.orderDate, 'DD.MM.YYYY') AS string) LIKE ?1
                )
                AND ((o.status = ?2 OR o.status = ?3))
                """
                + buildOrderByClause(sortField, sortDirection);
        OrderStatus status2 = status == OrderStatus.ACTIVE ? OrderStatus.PAID : status;
        status = status == OrderStatus.ACTIVE ? OrderStatus.CONFIRMED : status;
        return em.createQuery(query, Order.class)
                .setParameter(1, "%" + term.toLowerCase() + "%")
                .setParameter(2, status).setParameter(3, status2)
                .getResultList()
                .stream().map(this::mapToOrderDetailDto).collect(Collectors.toCollection(ArrayList::new));
    }

    public GroupedOrdersDTO getGroupedOrderOverview(
            String term, OrderStatus status, int limit, int offset,
            OrderSortField sortField, SortDirection sortDirection,
            OrderSortField groupSortField, SortDirection groupSortDirection,
            OrderGroupBy groupBy, int priceChunkSize) {

        // 1. Fetch ALL matching orders (no pagination yet)
        List<OrderDetailDTO> allOrders;
        if (term != null && status != null) {
            allOrders = getAllOrders(term, status, sortField, sortDirection);
        } else if (term != null) {
            allOrders = getAllOrders(term, sortField, sortDirection);
        } else if (status != null) {
            allOrders = getAllOrders(status, sortField, sortDirection);
        } else {
            allOrders = getAllOrders(sortField, sortDirection);
        }

        // 2. Group all orders to determine group order
        Map<String, List<OrderDetailDTO>> fullGrouped = new LinkedHashMap<>();
        for (OrderDetailDTO order : allOrders) {
            String key = computeGroupKey(order, groupBy, priceChunkSize);
            fullGrouped.computeIfAbsent(key, k -> new ArrayList<>()).add(order);
        }

        // 3. Build temporary group list and sort it
        List<OrderGroupDTO> sortedFullGroups = new ArrayList<>();
        for (var entry : fullGrouped.entrySet()) {
            String label = groupBy == OrderGroupBy.PRICE
                    ? computePriceGroupLabel(Integer.parseInt(entry.getKey()), priceChunkSize, groupSortDirection)
                    : computeGroupLabel(entry.getKey(), groupBy);
            sortedFullGroups.add(new OrderGroupDTO(entry.getKey(), label, entry.getValue()));
        }
        sortedFullGroups.sort(buildGroupComparator(groupBy, groupSortField, groupSortDirection));

        // 4. Flatten into group-sorted order, then paginate
        List<OrderDetailDTO> flatSorted = new ArrayList<>();
        // Keep a parallel list of group keys for re-grouping after pagination
        List<String> flatKeys = new ArrayList<>();
        List<String> flatLabels = new ArrayList<>();
        for (OrderGroupDTO group : sortedFullGroups) {
            for (OrderDetailDTO order : group.orders()) {
                flatSorted.add(order);
                flatKeys.add(group.groupKey());
                flatLabels.add(group.groupLabel());
            }
        }

        int start = offset * limit;
        int end = Math.min(start + limit, flatSorted.size());
        if (start >= flatSorted.size()) {
            return new GroupedOrdersDTO(List.of(), flatSorted.size());
        }

        // 5. Re-group the paginated slice (preserving group order)
        LinkedHashMap<String, List<OrderDetailDTO>> pageGrouped = new LinkedHashMap<>();
        LinkedHashMap<String, String> pageLabelMap = new LinkedHashMap<>();
        for (int i = start; i < end; i++) {
            String key = flatKeys.get(i);
            pageGrouped.computeIfAbsent(key, k -> new ArrayList<>()).add(flatSorted.get(i));
            pageLabelMap.putIfAbsent(key, flatLabels.get(i));
        }

        List<OrderGroupDTO> groups = new ArrayList<>();
        for (var entry : pageGrouped.entrySet()) {
            groups.add(new OrderGroupDTO(entry.getKey(), pageLabelMap.get(entry.getKey()), entry.getValue()));
        }

        return new GroupedOrdersDTO(groups, flatSorted.size());
    }

    private String computeGroupKey(OrderDetailDTO order, OrderGroupBy groupBy, int priceChunkSize) {
        return switch (groupBy) {
            case NONE ->
                "all";
            case PERSON ->
                order.customer().firstName() + " " + order.customer().lastName();
            case STATUS ->
                order.order().status().name();
            case PRICE -> {
                int chunk = priceChunkSize > 0 ? priceChunkSize : 50;
                double total = order.order().calcTotal();
                int bucket = (int) (total / chunk);
                yield bucket + "";
            }
            case DAY -> {
                LocalDateTime date = order.order().orderDate();
                yield date.toLocalDate().format(DAY_FORMATTER);
            }
            case MONTH -> {
                LocalDateTime date = order.order().orderDate();
                yield YearMonth.from(date).toString();
            }
            case YEAR -> {
                LocalDateTime date = order.order().orderDate();
                yield String.valueOf(date.getYear());
            }
        };
    }

    private String computeGroupLabel(String key, OrderGroupBy groupBy) {
        return switch (groupBy) {
            case NONE ->
                "Alle Bestellungen";
            case PERSON ->
                key;
            case STATUS ->
                switch (OrderStatus.valueOf(key)) {
                    case DONE ->
                        "Abgeholt";
                    case PAID ->
                        "Bezahlt";
                    case CONFIRMED ->
                        "Bestätigt";
                    case WAITING ->
                        "Unbestätigt";
                    case CANCELLED ->
                        "Abgebrochen";
                    case ACTIVE ->
                        "Aktiv";
                };
            case PRICE -> {
                // key is the bucket number, we need the chunk size to compute the range
                // The label will be computed with a fallback
                yield "Preisgruppe " + key;
            }
            case DAY ->
                key;
            case MONTH -> {
                YearMonth ym = YearMonth.parse(key);
                yield ym.format(MONTH_FORMATTER);
            }
            case YEAR ->
                key;
        };
    }

    public String computePriceGroupLabel(int bucket, int chunkSize, SortDirection direction) {
        int low = bucket * chunkSize;
        int high = low + chunkSize;
        if (direction == SortDirection.DESC) {
            return "€ " + high + " – € " + low;
        }
        return "€ " + low + " – € " + high;
    }

    private Comparator<OrderGroupDTO> buildGroupComparator(OrderGroupBy groupBy, OrderSortField groupSortField,
            SortDirection groupSortDirection) {
        Comparator<OrderGroupDTO> comparator = switch (groupBy) {
            case STATUS ->
                Comparator.comparingInt(g -> {
                    try {
                        return STATUS_ORDER.indexOf(OrderStatus.valueOf(g.groupKey()));
                    } catch (Exception e) {
                        return Integer.MAX_VALUE;
                    }
                });
            case DAY ->
                Comparator.comparing(g -> {
                    try {
                        return LocalDate.parse(g.groupKey(), DAY_FORMATTER);
                    } catch (Exception e) {
                        return LocalDate.MIN;
                    }
                });
            case MONTH ->
                Comparator.comparing(g -> {
                    try {
                        return YearMonth.parse(g.groupKey());
                    } catch (Exception e) {
                        return YearMonth.of(1900, 1);
                    }
                });
            case YEAR ->
                Comparator.comparing(g -> {
                    try {
                        return Integer.parseInt(g.groupKey());
                    } catch (Exception e) {
                        return 0;
                    }
                });
            case PRICE ->
                Comparator.comparingInt(g -> {
                    try {
                        return Integer.parseInt(g.groupKey());
                    } catch (Exception e) {
                        return 0;
                    }
                });
            case PERSON ->
                Comparator.comparing(OrderGroupDTO::groupKey, String.CASE_INSENSITIVE_ORDER);
            case NONE ->
                (a, b) -> 0;
        };

        if (groupSortDirection == SortDirection.DESC) {
            comparator = comparator.reversed();
        }
        return comparator;
    }

    public OrderDetailDTO getOrderDetails(UUID orderID) {
        return mapToOrderDetailDto(orderRepo.findById(orderID));
    }

    public OrderDetailDTO getOrderBySeatId(String seatId) {
        String query = "SELECT o FROM Order o JOIN o.seats s WHERE s.id = :seatId";
        Order order = em.createQuery(query, Order.class)
                .setParameter("seatId", seatId)
                .getResultStream()
                .findFirst()
                .orElse(null);

        if (order == null) {
            return null;
        }

        return mapToOrderDetailDto(order);
    }

    public OrderMailDTO getOrderMailDto(UUID orderID) {
        Order order = orderRepo.findById(orderID);
        if (order == null) {
            return null;
        }
        return mapToOrderMailDto(order);
    }

    public boolean sendPaymentConfirmation(UUID orderId) {
        Order o = em.find(Order.class, orderId);
        if (o == null) {
            return false;
        }

        if (o.getStatus() == OrderStatus.CONFIRMED) {
            try {
                double additionalCharge = ticketManager.getAdditionalChargeForPhysicalTicket();
                String additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
                OrderMailDTO mailDto = mapToOrderMailDto(o);
                if (o.getTickets().stream().filter(ticket -> !ticket.isPhysical()).count() > 4) {
                    mailService.sendPaymentConfirmationMail(mailDto, additionalCharge, additionalChargeFormatted, null);
                } else {
                    // Get digital ticket downloads for email attachment
                    List<byte[]> ticketDownloads = o.getTickets().stream()
                            .filter(ticket -> !ticket.isPhysical())
                            .map(ticket -> ticketManager.getTicketDownload(ticket.getId().toString()))
                            .collect(Collectors.toCollection(ArrayList::new));
                    mailService.sendPaymentConfirmationMail(mailDto, additionalCharge, additionalChargeFormatted,
                            ticketDownloads);
                }

                o.setStatus(OrderStatus.PAID);
            } catch (Exception e) {
                log.error("Failed to send payment confirmation for order: {}", orderId, e);
                return false;
            }
            return true;
        }
        return false;
    }

    public boolean addAdmin(AdminDTO dto) {
        Admin admin = new Admin(dto.id(), dto.name(), dto.priority());
        adminRepo.persist(admin);
        return true;
    }

    public boolean deleteAdmin(String id) {
        if (id.contains(EXTERN_STRING)) {
            securityAdminRepo.delete("id", id.split(EXTERN_STRING)[0]);
        } else {
            adminRepo.delete("id", id);
        }

        return true;
    }

    public List<AdminDTO> getAdmins() {
        List<SecurityAdmin> securityAdmins = securityAdminRepo.listAll();
        List<Admin> admins = adminRepo.listAll();
        return Stream
                .concat(securityAdmins.stream()
                        .map(a -> new AdminDTO(a.getId() + EXTERN_STRING, a.getUsername(), a.getPriority())),
                        admins.stream().map(a -> new AdminDTO(a.getId(), a.getAdminName(), a.getPriority())))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public boolean changeAdminPriority(String id, AdminPriority priority) {
        Admin admin = adminRepo.findById(id);
        if (admin == null) {
            return false;
        }
        admin.setPriority(priority);
        return true;
    }

    public AdminPriority getAdminPriority(String id) {
        Admin admin = adminRepo.findById(id);
        if (admin == null) {
            return null;
        }
        return admin.getPriority();
    }

    @Transactional
    public boolean addOrder(ReservationDTO dto) {
        try {
            Customer customer = new Customer();
            customer.setId(UUID.randomUUID());
            customer.setFirstName(dto.customer().firstName());
            customer.setLastName(dto.customer().lastName());
            customer.setMailAddress(dto.customer().mailAddress());
            customer.setPhoneNumber(dto.customer().phoneNumber());
            customer.setSchoolClass(dto.customer().schoolClass());
            customer.setMale(dto.customer().isMale());
            customer.setStreet(dto.customer().street());
            customer.setStreetNumber(dto.customer().streetNumber());
            customer.setZipCode(dto.customer().zipCode());
            customer.setTown(dto.customer().town());

            customerRepo.persist(customer);

            Order order = new Order();
            order.setStatus(OrderStatus.WAITING);
            order.setOrderDate(LocalDateTime.now());
            order.setCustomer(customer);

            orderRepo.persist(order);

            if (dto.tickets() != null && !dto.tickets().isEmpty()) {
                List<Ticket> tickets = new ArrayList<>();
                for (Object ticketObj : dto.tickets()) {

                    TicketType ticketType = TicketType.valueOf((String) ticketObj);

                    Ticket ticket = new Ticket(ticketType, order, false);
                    tickets.add(ticket);
                    ticket.setOrder(order);
                    ticketRepo.persist(ticket);
                }
                order.setTickets(new HashSet<>(tickets));
                ticketRepo.persist(tickets);
            }

            if (dto.seats() != null && !dto.seats().isEmpty()) {
                List<Seat> seats = new ArrayList<>();
                for (Object seatObj : dto.seats()) {
                    Seat seat = new Seat((SeatDTO) seatObj);
                    seat.setOrder(order);
                    seats.add(seat);
                    seatRepo.persist(seat);
                }
                order.setSeats(seats);
                seatRepo.persist(seats);
            }

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public MailConfigDTO getMailConfig() {
        MailConfig config = mailConfigRepo.findById(1L);
        if (config == null) {
            return new MailConfigDTO("", null, "", "", "", "");
        }
        return new MailConfigDTO(
                config.getHost(),
                config.getPort(),
                config.getUsername(),
                config.getPassword() != null && !config.getPassword().isEmpty() ? "********" : "",
                config.getFromName(),
                config.getFromAddress());
    }

    @Transactional
    public void updateMailConfig(MailConfigDTO dto) {
        String encryptedPassword = null;
        if (dto.getPassword() != null && !dto.getPassword().equals("********") && !dto.getPassword().isEmpty()) {
            encryptedPassword = encryptionManager.encrypt(dto.getPassword());
        } else if (dto.getPassword() == null || dto.getPassword().equals("********")) {
            // Keep existing password
            MailConfig existing = mailConfigRepo.findById(1L);
            if (existing != null) {
                encryptedPassword = existing.getPassword();
            }
        }

        long count = mailConfigRepo.count();
        if (count == 0) {
            MailConfig config = new MailConfig();
            config.setId(1L);
            config.setHost(dto.getHost());
            config.setPort(dto.getPort());
            config.setUsername(dto.getUsername());
            config.setPassword(encryptedPassword);
            config.setFromName(dto.getFromName());
            config.setFromAddress(dto.getFromAddress());
            mailConfigRepo.getEntityManager().persist(config);
        } else {
            mailConfigRepo.getEntityManager().createQuery(
                "UPDATE MailConfig c SET c.host = :host, c.port = :port, c.username = :username, " +
                "c.password = :password, c.fromName = :fromName, c.fromAddress = :fromAddress WHERE c.id = 1")
                .setParameter("host", dto.getHost())
                .setParameter("port", dto.getPort())
                .setParameter("username", dto.getUsername())
                .setParameter("password", encryptedPassword)
                .setParameter("fromName", dto.getFromName())
                .setParameter("fromAddress", dto.getFromAddress())
                .executeUpdate();
        }
    }

    public Integer testMailConfig(MailConfigDTO dto) throws Exception {
        io.vertx.ext.mail.MailConfig config = new io.vertx.ext.mail.MailConfig();
        config.setHostname(dto.getHost());
        config.setUsername(dto.getUsername());
        // Match the auth methods from application.properties to support Outlook/Exchange
        config.setAuthMethods("DIGEST-MD5 CRAM-SHA256 CRAM-SHA1 CRAM-MD5 PLAIN LOGIN");

        String testPassword = dto.getPassword();
        if ("********".equals(testPassword)) {
            MailConfig dbConfig = mailConfigRepo.findById(1L);
            if (dbConfig != null) {
                testPassword = encryptionManager.decrypt(dbConfig.getPassword());
            }
        }
        config.setPassword(testPassword);

        java.util.List<Integer> portsToTest;
        if (dto.getPort() != null && dto.getPort() > 0) {
            portsToTest = java.util.List.of(dto.getPort());
        } else {
            portsToTest = java.util.List.of(587, 465, 25);
        }

        java.util.Map<Integer, String> errors = new java.util.HashMap<>();
        for (int port : portsToTest) {
            try {
                config.setPort(port);
                if (port == 587) {
                    config.setStarttls(io.vertx.ext.mail.StartTLSOptions.REQUIRED);
                } else if (port == 465) {
                    config.setSsl(true);
                } else {
                    config.setStarttls(io.vertx.ext.mail.StartTLSOptions.DISABLED);
                    config.setSsl(false);
                }
                io.vertx.ext.mail.MailClient client = io.vertx.ext.mail.MailClient.createShared(vertx, config,
                        "test-mail-pool-" + port);

                io.vertx.ext.mail.MailMessage msg = new io.vertx.ext.mail.MailMessage();
                msg.setFrom(dto.getFromAddress() != null && !dto.getFromAddress().isEmpty() ? dto.getFromAddress()
                        : "test@example.com");
                msg.setTo(msg.getFrom());
                msg.setSubject("Test Connection");
                msg.setText("This is a test.");

                client.sendMail(msg).toCompletionStage().toCompletableFuture().join();
                return port; // Success
            } catch (Exception e) {
                log.warn("Test failed for port " + port, e);
                errors.put(port, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            }
        }
        
        StringBuilder errMsg = new StringBuilder("Alle getesteten Ports fehlschlagen:\\n");
        for (java.util.Map.Entry<Integer, String> entry : errors.entrySet()) {
            errMsg.append("Port ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\\n");
        }
        throw new Exception(errMsg.toString());
    }
}
