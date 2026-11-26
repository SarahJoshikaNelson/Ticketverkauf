package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.TicketType;
import at.htlleonding.exceptions.MissingData;
import at.htlleonding.exceptions.MissingDataException;
import at.htlleonding.repositories.*;
import at.htlleonding.types.*;
import at.htlleonding.types.dtos.CustomerDTO;
import at.htlleonding.types.dtos.ReservationBookingReqDTO;
import at.htlleonding.types.dtos.ReservationDTO;
import at.htlleonding.types.dtos.TicketBookingEndpointDto;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import at.htlleonding.types.dtos.mails.ActivationMailDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class BookingManager {
    private SeatRepo seatRepo;
    private OrderRepo orderRepo;
    private CustomerRepo customerRepo;
    private TicketRepo ticketRepo;
    private MailManager mailManager;
    private StudentRepo studentRepo;
    private SettingRepo settingRepo;
    private GraduateRepo graduateRepo;
    private UserManager userManager;
    private DataManager dataManager;
    private TicketManager ticketManager;
    private AdminManager adminManager;

    @Transactional
    public void bookViaStripeAlreadyPaid(ReservationBookingReqDTO reservationDto, String name, double additionalChargeForPhysicalTicket) {
        if (reservationDto.tickets().isEmpty() && (reservationDto.seats() == null || reservationDto.seats().isEmpty()))
            throw new MissingDataException(MissingData.ITEMS);
        if (reservationDto.customer() == null)
            throw new MissingDataException(MissingData.CUSTOMER);

        log.info("Received reservationDTO: {}", reservationDto);
        log.info("Seats in reservationDTO: {}", reservationDto.seats());

        // create customer
        Customer customer = new Customer(
                reservationDto.customer().firstName(),
                reservationDto.customer().lastName(),
                reservationDto.customer().mailAddress(),
                reservationDto.customer().phoneNumber(),
                reservationDto.customer().schoolClass(),
                reservationDto.customer().isMale(),
                reservationDto.customer().street(),
                reservationDto.customer().streetNumber(),
                reservationDto.customer().zipCode(),
                reservationDto.customer().town());

        customerRepo.persist(customer);
        Order order = new Order(customer);
        order.setStatus(OrderStatus.PAID);
        order.setInvoiceNumber(generateNextInvoiceNumber());
        User user = userManager.getOrCreateUser(name, customer.getMailAddress());
        order.setUser(user);

        // create Ticket reservation
        List<Ticket> tickets = new ArrayList<>();

        var reservation = reservationDto.toReservationDTO(additionalChargeForPhysicalTicket, tickets);
        orderRepo.persist(order);

        for (TicketBookingEndpointDto ticket : reservationDto.tickets()) {
            Ticket newTicket = new Ticket(ticket.type(), order, ticket.isPhysical());
            tickets.add(newTicket);

            if (ticket.type() == TicketType.STUDENT) {
                Student student = new Student();
                student.setId(name);
                student.setBoughtTicket(true);
                studentRepo.persist(student);
            }

            ticketRepo.persist(newTicket);
        }

        order.setTickets(new HashSet<>(tickets));
        ticketRepo.persist(tickets);

        log.info("reservation seats: {}", reservation.seats());

        // Validate that all requested seats are available
        if (reservation.seats() != null && !reservation.seats().isEmpty()) {
            for (var seatDTO : reservation.seats()) {
                if (seatRepo.isSeatTaken(seatDTO.getId())) {
                    throw new IllegalArgumentException("Seat " + seatDTO.getId() + " is already booked and not available");
                }
            }
        }

        assert reservation.seats() != null :
                "Seats in reservation had been assumed not null here by the following code, so I added this assertion. Please fix if incorrect.";
        List<Seat> seats = reservation.seats().stream()
                .map(seatDTO -> {
                    log.info("Processing seat: {}", seatDTO);
                    Seat seat = seatRepo.find("id", seatDTO.getId()).singleResultOptional()
                            .orElseThrow(() -> new IllegalArgumentException("Seat not found"));
                    log.info("Found seat: {}", seat);
                    return seat;
                })
                .collect(Collectors.toCollection(ArrayList::new));

        // Set the bidirectional relationship: order -> seats and seats -> order
        order.setSeats(seats);
        for (Seat seat : seats) {
            seat.setOrder(order);
        }

        log.info("Seats: {}", seats);
        for (Seat seat : seats) {
            seatRepo.persist(seat);
        }
        orderRepo.persist(order);

        OrderMailDTO paymentMailDto = adminManager.getOrderMailDto(order.getId());
        List<byte[]> ticketDownloads = order.getTickets().stream()
                .filter(ticket -> !ticket.isPhysical())
                .map(ticket -> ticketManager.getTicketDownload(ticket.getId().toString()))
                .collect(Collectors.toCollection(ArrayList::new));

        mailManager.sendPaymentConfirmationMail(
                paymentMailDto,
                ticketManager.getAdditionalChargeForPhysicalTicket(),
                ticketManager.getAdditionalChargeForPhysicalTicketFormatted(),
                ticketDownloads.size() > 4 ? null : ticketDownloads);
    }

    @Transactional
    public Collection<Ticket> book(
            ReservationBookingReqDTO reservationDto,
            String name,
            double additionalChargeForPhysicalTicket
    ) {
        if (reservationDto.tickets().isEmpty() && (reservationDto.seats() == null || reservationDto.seats().isEmpty()))
            throw new MissingDataException(MissingData.ITEMS);
        if (reservationDto.customer() == null)
            throw new MissingDataException(MissingData.CUSTOMER);

        log.info("Received reservationDTO: {}", reservationDto);
        log.info("Seats in reservationDTO: {}", reservationDto.seats());

        // create customer
        Customer customer = new Customer(
                reservationDto.customer().firstName(),
                reservationDto.customer().lastName(),
                reservationDto.customer().mailAddress(),
                reservationDto.customer().phoneNumber(),
                reservationDto.customer().schoolClass(),
                reservationDto.customer().isMale(),
                reservationDto.customer().street(),
                reservationDto.customer().streetNumber(),
                reservationDto.customer().zipCode(),
                reservationDto.customer().town());

        customerRepo.persist(customer);
        Order order = new Order(customer);
        User user = userManager.getOrCreateUser(name, customer.getMailAddress());
        order.setUser(user);

        // create Ticket reservation
        List<Ticket> tickets = new ArrayList<>();

        var reservation = reservationDto.toReservationDTO(additionalChargeForPhysicalTicket, tickets);
        orderRepo.persist(order);

        // there are enough tickets available to no overbook
        if (calculateBookedTicketCount() + reservationDto.tickets().size() <= settingRepo.findById("MaxTicketCount").getValue()) {
            for (TicketBookingEndpointDto ticket : reservationDto.tickets()) {
                Ticket newTicket = new Ticket(ticket.type(), order, ticket.isPhysical());
                tickets.add(newTicket);

                if (ticket.type() == TicketType.STUDENT) {
                    Student student = new Student();
                    student.setId(name);
                    student.setBoughtTicket(true);
                    studentRepo.persist(student);
                }

                if (ticket.type() == TicketType.GRADUATE) {
                    Graduate grad = graduateRepo.findById(name.toUpperCase());
                    int ticketCount = grad.getFreeTicketCount();
                    grad.setFreeTicketCount(ticketCount + 1);
                    graduateRepo.persist(grad);
                }

                ticketRepo.persist(newTicket);
            }

            order.setTickets(new HashSet<>(tickets));
            ticketRepo.persist(tickets);
        }

        log.info("reservation seats: {}", reservation.seats());

        // Validate that all requested seats are available
        if (reservation.seats() != null && !reservation.seats().isEmpty()) {
            for (var seatDTO : reservation.seats()) {
                if (seatRepo.isSeatTaken(seatDTO.getId())) {
                    throw new IllegalArgumentException("Seat " + seatDTO.getId() + " is already booked and not available");
                }
            }
        }

        assert reservation.seats() != null :
                "Seats in reservation had been assumed not null here by the following code, so I added this assertion. Please fix if incorrect.";
        List<Seat> seats = reservation.seats().stream()
                .map(seatDTO -> {
                    log.info("Processing seat: {}", seatDTO);
                    Seat seat = seatRepo.find("id", seatDTO.getId()).singleResultOptional()
                            .orElseThrow(() -> new IllegalArgumentException("Seat not found"));
                    log.info("Found seat: {}", seat);
                    return seat;
                })
                .collect(Collectors.toCollection(ArrayList::new));

        // Set the bidirectional relationship: order -> seats and seats -> order
        order.setSeats(seats);
        for (Seat seat : seats) {
            seat.setOrder(order);
        }

        log.info("Seats: {}", seats);
        for (Seat seat : seats) {
            seatRepo.persist(seat);
        }
        orderRepo.persist(order);

        // Send activation mail after seats are assigned
        this.sendActivationMail(order.getCustomer().getMailAddress(), order);

        return order.getTickets();
    }

    /**
     * Creates a provisional WAITING order with tickets and locked seats for the Stripe checkout flow.
     * Uses pessimistic locking on MaxTicketCount and each seat to prevent overselling.
     */
    @Transactional
    public Order reserveForStripe(ReservationBookingReqDTO reservationDto, String name, double additionalChargeForPhysicalTicket) {
        if (reservationDto.tickets().isEmpty() && (reservationDto.seats() == null || reservationDto.seats().isEmpty()))
            throw new MissingDataException(MissingData.ITEMS);
        if (reservationDto.customer() == null)
            throw new MissingDataException(MissingData.CUSTOMER);

        // Lock MaxTicketCount row to serialize concurrent reservation attempts
        Setting maxTicketSetting = settingRepo.getEntityManager()
                .find(Setting.class, "MaxTicketCount", LockModeType.PESSIMISTIC_WRITE);
        if (maxTicketSetting != null) {
            long maxCount = (long) maxTicketSetting.getValue();
            long currentCount = calculateBookedTicketCount();
            if (currentCount + reservationDto.tickets().size() > maxCount) {
                long available = maxCount - currentCount;
                throw new IllegalStateException(
                        "Nicht genügend Tickets verfügbar. Verfügbar: " + available
                                + ", angefragt: " + reservationDto.tickets().size() + ".");
            }
        }

        Customer customer = new Customer(
                reservationDto.customer().firstName(), reservationDto.customer().lastName(),
                reservationDto.customer().mailAddress(), reservationDto.customer().phoneNumber(),
                reservationDto.customer().schoolClass(), reservationDto.customer().isMale(),
                reservationDto.customer().street(), reservationDto.customer().streetNumber(),
                reservationDto.customer().zipCode(), reservationDto.customer().town());
        customerRepo.persist(customer);

        Order order = new Order(customer);
        User user = userManager.getOrCreateUser(name, customer.getMailAddress());
        order.setUser(user);
        orderRepo.persist(order);

        List<Ticket> tickets = new ArrayList<>();
        for (TicketBookingEndpointDto ticket : reservationDto.tickets()) {
            Ticket newTicket = new Ticket(ticket.type(), order, ticket.isPhysical());
            tickets.add(newTicket);
            if (ticket.type() == TicketType.STUDENT) {
                Student student = new Student();
                student.setId(name);
                student.setBoughtTicket(true);
                studentRepo.persist(student);
            }
            ticketRepo.persist(newTicket);
        }
        order.setTickets(new HashSet<>(tickets));

        if (reservationDto.seats() != null && !reservationDto.seats().isEmpty()) {
            List<Seat> seats = new ArrayList<>();
            for (var seatDTO : reservationDto.seats()) {
                Seat seat = seatRepo.getEntityManager()
                        .find(Seat.class, seatDTO.getId(), LockModeType.PESSIMISTIC_WRITE);
                if (seat == null)
                    throw new IllegalArgumentException("Sitzplatz nicht gefunden.");
                if (seat.getOrder() != null)
                    throw new IllegalStateException(
                            "Sitzplatz ist bereits vergeben. Bitte wählen Sie einen anderen Platz.");
                seat.setOrder(order);
                seatRepo.persist(seat);
                seats.add(seat);
            }
            order.setSeats(seats);
        }

        orderRepo.persist(order);
        return order;
    }

    /**
     * Upgrades a reserved (WAITING) order to PAID after successful Stripe payment.
     */
    @Transactional
    public void fulfillReservedOrder(UUID orderId) {
        Order order = orderRepo.findById(orderId);
        if (order == null) throw new IllegalArgumentException("Bestellung nicht gefunden.");

        order.setStatus(OrderStatus.PAID);
        order.setInvoiceNumber(generateNextInvoiceNumber());
        orderRepo.persist(order);

        OrderMailDTO paymentMailDto = adminManager.getOrderMailDto(order.getId());
        List<byte[]> ticketDownloads = order.getTickets().stream()
                .filter(ticket -> !ticket.isPhysical())
                .map(ticket -> ticketManager.getTicketDownload(ticket.getId().toString()))
                .collect(Collectors.toCollection(ArrayList::new));

        mailManager.sendPaymentConfirmationMail(
                paymentMailDto,
                ticketManager.getAdditionalChargeForPhysicalTicket(),
                ticketManager.getAdditionalChargeForPhysicalTicketFormatted(),
                ticketDownloads.size() > 4 ? null : ticketDownloads);
    }

    /**
     * Cancels a reserved order and releases its seats (e.g. when Stripe session expires).
     */
    @Transactional
    public void cancelReservedOrder(UUID orderId) {
        Order order = orderRepo.findById(orderId);
        if (order == null) return;

        order.setStatus(OrderStatus.CANCELLED);
        if (order.getSeats() != null) {
            for (Seat seat : order.getSeats()) {
                seat.setOrder(null);
                seatRepo.persist(seat);
            }
        }
        orderRepo.persist(order);
    }

    public long calculateBookedTicketCount() {
        return ticketRepo.listAll().stream()
                .filter(ticket -> ticket.getOrder().getStatus() != OrderStatus.CANCELLED)
                .count();
    }

    public void sendActivationMail(String mail, Order o) {
        // Convert Order to ReservationDTO
        CustomerDTO customerDTO = new CustomerDTO(
            o.getCustomer().getFirstName(),
            o.getCustomer().getLastName(),
            o.getCustomer().getMailAddress(),
            o.getCustomer().getPhoneNumber(),
            o.getCustomer().getSchoolClass(),
            o.getCustomer().isMale(),
            o.getCustomer().getStreet(),
            o.getCustomer().getStreetNumber(),
            o.getCustomer().getZipCode(),
            o.getCustomer().getTown()
        );
        
        ReservationDTO reservationDTO = new ReservationDTO(
            customerDTO,
            new ArrayList<>(o.getTickets()),
            ticketManager.getAdditionalChargeForPhysicalTicket(),
            o.getSeats(),
            null // No token needed for activation mail
        );
        
        ActivationMailDTO mailDTO = new ActivationMailDTO(reservationDTO, dataManager.getData(), o);
        mailManager.sendActivationMail(mail, mailDTO);
    }

    private Long generateNextInvoiceNumber() {
        Long maxInvoiceNumber = orderRepo.find("SELECT COALESCE(MAX(o.invoiceNumber), 0) FROM Order o")
                .project(Long.class)
                .firstResult();
        return maxInvoiceNumber + 1;
    }
}
