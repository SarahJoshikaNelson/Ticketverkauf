package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.TicketType;
import at.htlleonding.exceptions.OrderAlreadyConfirmedException;
import at.htlleonding.repositories.OrderRepo;
import at.htlleonding.repositories.SeatRepo;
import at.htlleonding.repositories.StudentRepo;
import at.htlleonding.repositories.TicketUpgradeRepo;
import at.htlleonding.types.Order;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Student;
import at.htlleonding.types.Ticket;
import at.htlleonding.types.dtos.CustomerDTO;
import at.htlleonding.types.dtos.ReservationDTO;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import at.htlleonding.types.dtos.mails.ConfirmationMailDTO;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.utils.PdfMerger;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = { @Inject })
@NoArgsConstructor
public class OrderManager {
    private OrderRepo orderRepo;
    private SeatRepo seatRepo;
    private MailManager mailManager;
    private SettingManager settingManager;
    private TicketManager ticketManager;
    private EntityManager em;
    private DataManager dataManager;
    private AdminManager adminManager;
    private PDFManager pdfManager;
    private StudentRepo studentRepo;
    private TicketUpgradeRepo ticketUpgradeRepo;

    private static final Logger log = LoggerFactory.getLogger(OrderManager.class);

    @Transactional
    public void toggleOrderStatus(UUID id, OrderStatus toggle) {
        Order order = orderRepo.findById(id);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }

        OrderStatus previousStatus = order.getStatus();

        if (toggle == OrderStatus.CANCELLED) {
            // When cancelling an order, clear the order relationship from seats to make them available again
            if (order.getSeats() != null) {
                order.getSeats().forEach(seat -> {
                    seat.setOrder(null);
                    seatRepo.persist(seat);
                });
            }

            if(order.getTickets().stream().anyMatch(ticket -> ticket.getTicketType() == TicketType.STUDENT)) {
                Student student = studentRepo.findById(order.getCustomer().getId().toString());
                if(student != null) {
                    student.setBoughtTicket(false);
                    studentRepo.persist(student);
                }
            }
        } else if (order.getStatus() == OrderStatus.CANCELLED && order.getSeats() != null) {
            // When reactivating a cancelled order, validate that seats are still available
            for (var seat : order.getSeats()) {
                if (seatRepo.isSeatTaken(seat.getId())) {
                    throw new IllegalArgumentException(
                            "Cannot reactivate order: Seat " + seat.getId() + " is no longer available");
                }
                seat.setOrder(order);
                seatRepo.persist(seat);
            }
        }

        order.setStatus(toggle);
        orderRepo.persist(order);

        // Prepare mail DTOs synchronously within the transaction (so the entity manager is active)
        ConfirmationMailDTO confirmationMailDTO = null;
        String confirmationRecipientEmail = null;
        String additionalChargeFormatted = null;
        if (toggle == OrderStatus.CONFIRMED && previousStatus != OrderStatus.CONFIRMED) {
            try {
                // Force lazy-loaded collections to initialize within transaction
                // This ensures all nested relationships are loaded before leaving the transaction
                List<Seat> seats = new ArrayList<>();
                if (order.getSeats() != null) {
                    for (Seat seat : order.getSeats()) {
                        // Access the table to force loading
                        if (seat.getTable() != null) {
                            seat.getTable().getName(); // Force load table
                            if (seat.getTable().getRoom() != null) {
                                seat.getTable().getRoom().getName(); // Force load room
                            }
                        }
                        seats.add(seat);
                    }
                }
                
                confirmationMailDTO = new ConfirmationMailDTO(
                        order.getId(),
                        new ReservationDTO(
                                new CustomerDTO(order.getCustomer().getFirstName(), order.getCustomer().getLastName(),
                                        order.getCustomer().getMailAddress().toLowerCase(),
                                        order.getCustomer().getPhoneNumber(), null,
                                        order.getCustomer().isMale(), order.getCustomer().getStreet(),
                                        order.getCustomer().getStreetNumber(),
                                        order.getCustomer().getZipCode(), order.getCustomer().getTown()),
                                new ArrayList<>(order.getTickets()),
                                ticketManager.getAdditionalChargeForPhysicalTicket(),
                                seats, null),
                        dataManager.getData());
                confirmationRecipientEmail = order.getCustomer().getMailAddress();
                additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
            } catch (Exception e) {
                log.error("Failed to prepare confirmation email for order {}", id, e);
            }
        }

        OrderMailDTO paymentMailDto = null;
        Double paymentAdditionalCharge = null;
        String paymentAdditionalChargeFormatted = null;
        List<byte[]> paymentTicketDownloads = null;
        if (toggle == OrderStatus.PAID && previousStatus != OrderStatus.PAID) {
            try {
                // Assign invoice number if not already assigned
                if (order.getInvoiceNumber() == null) {
                    order.setInvoiceNumber(generateNextInvoiceNumber());
                    orderRepo.persist(order);
                }
                
                // Force lazy-loaded collections to initialize within transaction
                // This ensures all nested relationships are loaded before calling getOrderMailDto
                if (order.getSeats() != null) {
                    for (Seat seat : order.getSeats()) {
                        // Access the table to force loading
                        if (seat.getTable() != null) {
                            seat.getTable().getName(); // Force load table
                            if (seat.getTable().getRoom() != null) {
                                seat.getTable().getRoom().getName(); // Force load room
                            }
                        }
                    }
                }
                
                // Force load tickets collection
                if (order.getTickets() != null) {
                    order.getTickets().size(); // Force load tickets
                }
                
                paymentMailDto = adminManager.getOrderMailDto(id);
                paymentAdditionalCharge = ticketManager.getAdditionalChargeForPhysicalTicket();
                paymentAdditionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
                
                // Prepare digital ticket downloads within transaction
                paymentTicketDownloads = getDigitalTicketDownloads(id);
                log.info("Prepared {} digital ticket PDFs for order {} within transaction", 
                        paymentTicketDownloads != null ? paymentTicketDownloads.size() : 0, id);
            } catch (Exception e) {
                log.error("Failed to prepare payment confirmation for order {}", id, e);
            }
        }

        // Send confirmation email in a background thread with all data prepared
        if (confirmationMailDTO != null && confirmationRecipientEmail != null && additionalChargeFormatted != null) {
            final ConfirmationMailDTO mailDTOToSend = confirmationMailDTO;
            final String recipientEmailToSend = confirmationRecipientEmail;
            final String chargeFormatted = additionalChargeFormatted;
            new Thread(() -> {
                try {
                    mailManager.sendConfirmationMail(recipientEmailToSend, mailDTOToSend, chargeFormatted);
                    log.info("Confirmation email sent successfully for order {}", id);
                } catch (Exception e) {
                    log.error("Failed to send confirmation email for order {}", id, e);
                }
            }).start();
        }

        // Send payment confirmation (with PDF) in a background thread with all data prepared
        // All database access must be done before spawning the background thread
        // Note: paymentTicketDownloads can be empty (not null) when there are more than 4 digital tickets
        if (paymentMailDto != null && paymentAdditionalCharge != null && 
            paymentAdditionalChargeFormatted != null && paymentTicketDownloads != null) {
            final OrderMailDTO mailDtoToSend = paymentMailDto;
            final double charge = paymentAdditionalCharge;
            final String chargeFormatted = paymentAdditionalChargeFormatted;
            final List<byte[]> ticketDownloads = paymentTicketDownloads;
            new Thread(() -> {
                try {
                    mailManager.sendPaymentConfirmationMail(mailDtoToSend, charge, chargeFormatted, ticketDownloads);
                    log.info("Payment confirmation email sent successfully for order {}", id);
                } catch (Exception e) {
                    log.error("Failed to send payment confirmation email for order {}", id, e);
                }
            }).start();
        }
    }

    private Long generateNextInvoiceNumber() {
        // Get the highest invoice number and increment by 1
        Long maxInvoiceNumber = orderRepo.find("SELECT COALESCE(MAX(o.invoiceNumber), 0) FROM Order o")
                .project(Long.class)
                .firstResult();
        return maxInvoiceNumber + 1;
    }

    @Transactional
    public void confirmOrder(UUID id) throws OrderAlreadyConfirmedException {
        Order order = orderRepo.findById(id);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }
        if (order.getStatus() == OrderStatus.WAITING) {
            order.setStatus(OrderStatus.CONFIRMED);

            // Force lazy-loaded collections to initialize within transaction
            // This ensures all nested relationships are loaded before leaving the transaction
            List<Seat> seats = new ArrayList<>();
            if (order.getSeats() != null) {
                for (Seat seat : order.getSeats()) {
                    // Access the table to force loading
                    if (seat.getTable() != null) {
                        seat.getTable().getName(); // Force load table
                        if (seat.getTable().getRoom() != null) {
                            seat.getTable().getRoom().getName(); // Force load room
                        }
                    }
                    seats.add(seat);
                }
            }

            // Prepare DTO and additional charge synchronously
            ConfirmationMailDTO mailDTO = new ConfirmationMailDTO(
                    order.getId(),
                    new ReservationDTO(
                            new CustomerDTO(order.getCustomer().getFirstName(), order.getCustomer().getLastName(),
                                    order.getCustomer().getMailAddress().toLowerCase(),
                                    order.getCustomer().getPhoneNumber(), null,
                                    order.getCustomer().isMale(), order.getCustomer().getStreet(),
                                    order.getCustomer().getStreetNumber(),
                                    order.getCustomer().getZipCode(), order.getCustomer().getTown()),
                            new ArrayList<>(order.getTickets()),
                            ticketManager.getAdditionalChargeForPhysicalTicket(),
                            seats, null),
                    dataManager.getData());

            String recipientEmail = order.getCustomer().getMailAddress();
            String additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();

            // Send mail in background thread
            new Thread(() -> {
                try {
                    mailManager.sendConfirmationMail(recipientEmail, mailDTO, additionalChargeFormatted);
                } catch (Exception e) {
                    log.error("Failed to send confirmation email for order {}", id, e);
                }
            }).start();

            orderRepo.persist(order);
        } else {
            throw new OrderAlreadyConfirmedException();
        }
    }

    public byte[] getFullOrderDownload(List<byte[]> ticketDownloads) {
        if (ticketDownloads == null || ticketDownloads.isEmpty()) {
            throw new IllegalArgumentException("No tickets to combine");
        }

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument mergedPdf = new PdfDocument(writer);
            PdfMerger merger = new PdfMerger(mergedPdf);

            for (byte[] ticketPdf : ticketDownloads) {
                PdfDocument sourcePdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(ticketPdf)));
                merger.merge(sourcePdf, 1, sourcePdf.getNumberOfPages());
                sourcePdf.close();
            }

            mergedPdf.close();
            return outputStream.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to merge ticket PDFs", e);
        }
    }

    public List<byte[]> getTicketDownloads(UUID id) {
        Order order = orderRepo.findById(id);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }
        return order.getTickets().stream()
                .map(ticket -> ticketManager.getTicketDownload(ticket.getId().toString()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public List<byte[]> getDigitalTicketDownloads(UUID id) {
        Order order = orderRepo.findById(id);
        
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }

        if (order.getTickets().stream().filter(ticket -> !ticket.isPhysical()).count() > 4) {
            return new ArrayList<>();
        }

        return order.getTickets().stream()
                .filter(ticket -> !ticket.isPhysical())
                .map(ticket -> ticketManager.getTicketDownload(ticket.getId().toString()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public byte[] getTicketByIndex(UUID orderId, int ticketIndex) {
        Order order = orderRepo.findById(orderId);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }

        var ticketsList = new ArrayList<>(order.getTickets().stream().sorted(Comparator.comparing(Ticket::getId)).collect(Collectors.toList()));
        if (ticketIndex < 0 || ticketIndex >= ticketsList.size()) {
            throw new IndexOutOfBoundsException("Ticket index " + ticketIndex + " out of bounds for order with " + ticketsList.size() + " tickets");
        }
        
        var ticket = ticketsList.get(ticketIndex);
        return ticketManager.getTicketDownload(ticket.getId().toString());
    }

    public byte[] getBillDownload(UUID id) {
        Order order = orderRepo.findById(id);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }
        
        log.info("Generating bill PDF in memory for order: {}", id);
        try {
            // Force lazy-loaded collections to initialize
            // This ensures all nested relationships are loaded before calling getOrderMailDto
            if (order.getSeats() != null) {
                for (Seat seat : order.getSeats()) {
                    // Access the table to force loading
                    if (seat.getTable() != null) {
                        seat.getTable().getName(); // Force load table
                        if (seat.getTable().getRoom() != null) {
                            seat.getTable().getRoom().getName(); // Force load room
                        }
                    }
                }
            }
            
            // Force load tickets collection
            if (order.getTickets() != null) {
                order.getTickets().size(); // Force load tickets
            }
            
            double additionalCharge = ticketManager.getAdditionalChargeForPhysicalTicket();
            String additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
            OrderMailDTO mailDto = adminManager.getOrderMailDto(id);
            byte[] pdfData = pdfManager.generatePDF(mailDto, additionalCharge, additionalChargeFormatted);
            log.info("Successfully generated bill PDF in memory, size: {} bytes", pdfData.length);
            return pdfData;
        } catch (Exception e) {
            log.error("Failed to generate bill PDF for order: {}", id, e);
            throw new RuntimeException("Failed to generate bill PDF: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void removeUnconfirmedOrdersOlderThan(Duration duration) {
        LocalDateTime cutoff = LocalDateTime.now().minus(duration);
        List<Order> unconfirmedOrders = orderRepo.findUnconfirmedOrdersOlderThan(cutoff);

        for (Order order : unconfirmedOrders) {
            // Clear seat references before deleting the order to avoid foreign key
            // constraint violations
            if (order.getSeats() != null) {
                order.getSeats().forEach(seat -> {
                    seat.setOrder(null);
                    seatRepo.persist(seat);
                });
            }

            if(order.getTickets().stream().anyMatch(ticket -> ticket.getTicketType() == TicketType.STUDENT)) {
                Student student = studentRepo.findById(order.getCustomer().getId().toString());
                if(student != null) {
                    student.setBoughtTicket(false);
                    studentRepo.persist(student);
                }
            }

            for (Ticket ticket : order.getTickets()) {
                ticketUpgradeRepo.delete("ticket", ticket);
            }

            em.remove(order);
        }
    }

    public Order[] getOrders(String email) {
        return orderRepo.find("customer.mailAddress", email).list().toArray(new Order[0]);
    }

    public Order getOrderById(UUID id) {
        return orderRepo.findById(id);
    }

    public boolean isOrderOwnedByEmail(UUID orderId, String email) {
        Order order = orderRepo.findById(orderId);
        if (order == null) {
            return false;
        }
        return order.getCustomer().getMailAddress().equalsIgnoreCase(email);
    }
}
