package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.TicketType;
import at.htlleonding.extensions.MoneyExtension;
import at.htlleonding.repositories.GraduateRepo;
import at.htlleonding.repositories.SettingRepo;
import at.htlleonding.repositories.StudentRepo;
import at.htlleonding.repositories.TicketRepo;
import at.htlleonding.types.Graduate;
import at.htlleonding.types.Setting;
import at.htlleonding.types.Ticket;
import at.htlleonding.types.dtos.PhysicalTicketResponseDTO;
import io.smallrye.common.constraint.NotNull;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class TicketManager {
    private TicketRepo ticketRepository;
    private SettingRepo settingRepository;
    private StudentRepo studentRepository;
    private GraduateRepo graduateRepository;
    private TicketDesignManager ticketDesignManager;
    private static final String MAX_TICKET_COUNT_PER_ORDER_STRING = "MaxTicketCountPerOrder";

    @PostConstruct
    public void initPrices() {
        try {
            double studentPrice = settingRepository.findById("StudentTicketPrice").getValue();
            TicketType.STUDENT.setPrice(studentPrice);

            double externalPrice = settingRepository.findById("ExternTicketPrice").getValue();
            TicketType.EXTERNAL.setPrice(externalPrice);
        } catch (Exception e) {
            // Ignore if settings are not present on startup (e.g. migration pending)
        }
    }

    @Transactional
    public void setMaxTicket(@NotNull int maxTicket) {
        if (ticketRepository.listAll().size() > maxTicket) {
            throw new IllegalArgumentException("Max ticket count is smaller than current ticket count");
        }
        settingRepository.update("SET value = ?1 WHERE key = 'MaxTicketCount'", maxTicket);
    }

    public byte[] getTicketDownload(String id) {
        Ticket ticket = ticketRepository.findById(UUID.fromString(id));
        if (ticket == null) {
            throw new IllegalArgumentException("Ticket not found");
        }

        return generateTicketPdf(ticket);
    }

    private byte[] generateTicketPdf(Ticket ticket) {
        return ticketDesignManager.generateTicketPdf(ticket);
    }

    public int getMaxTicketCount() {
        return (int) settingRepository.findById("MaxTicketCount").getValue();
    }

    public double getStudentTicketPrice() {
        return settingRepository.findById("StudentTicketPrice").getValue();
    }

    @Transactional
    public void setStudentTicketPrice(@NotNull double price) {
        if (price < 0) {
            throw new IllegalArgumentException("Price must be greater than 0");
        }

        settingRepository.update("SET value = ?1 WHERE key = 'StudentTicketPrice'", price);

        TicketType.STUDENT.setPrice(price);
    }

    public double getExternTicketPrice() {
        return settingRepository.findById("ExternTicketPrice").getValue();
    }

    @Transactional
    public void setExternTicketPrice(@NotNull double price) {
        if (price < 0) {
            throw new IllegalArgumentException("Price must be greater than 0");
        }

        settingRepository.update("SET value = ?1 WHERE key = 'ExternTicketPrice'", price);

        TicketType.EXTERNAL.setPrice(price);
    }

    public boolean isAllowedToBuyTicket(String id) {
        if (studentRepository.findById(id) == null) {
            return true;
        }

        return !studentRepository.findById(id).isBoughtTicket();
    }

    public int isFreeTicketPrivileged(String id) {
        if (id.isEmpty()) {
            return 0;
        }

        Graduate grad = graduateRepository.findById(id.toUpperCase());
        if (grad != null) {
            return 2 - grad.getFreeTicketCount();
        }

        return 0;
    }

    public int getBoughtTickets() {
        return (int) ticketRepository.listAll().stream()
                .filter(ticket -> ticket.getOrder().getStatus() != OrderStatus.CANCELLED)
                .count();
    }

    public double getAdditionalChargeForPhysicalTicket() {
        return settingRepository.findById("PhysicalTicketAdditionalCharge").getValue();
    }

    @Transactional
    public void setAdditionalChargeForPhysicalTicket(double newPrice) {
        settingRepository.update("SET value = ?1 WHERE key = 'PhysicalTicketAdditionalCharge'", newPrice);
    }

    @Transactional
    public int getMaxTicketCountPerOrder() {
        var setting = settingRepository.findById(MAX_TICKET_COUNT_PER_ORDER_STRING);
        if (setting == null) {
            // Initialize with default value if not present
            setting = new Setting();
            setting.setKey(MAX_TICKET_COUNT_PER_ORDER_STRING);
            setting.setValue(25);
            settingRepository.persist(setting);
        }
        return (int) setting.getValue();
    }

    @Transactional
    public void setMaxTicketCountPerOrder(@NotNull int maxTicketCountPerOrder) {
        if (maxTicketCountPerOrder < 1) {
            throw new IllegalArgumentException("Max ticket count per order must be at least 1");
        }
        var setting = settingRepository.findById(MAX_TICKET_COUNT_PER_ORDER_STRING);
        if (setting == null) {
            // Create setting if it doesn't exist
            setting = new Setting();
            setting.setKey(MAX_TICKET_COUNT_PER_ORDER_STRING);
            setting.setValue(maxTicketCountPerOrder);
            settingRepository.persist(setting);
        } else {
            settingRepository.update("SET value = ?1 WHERE key = 'MaxTicketCountPerOrder'", maxTicketCountPerOrder);
        }
    }

    public String getAdditionalChargeForPhysicalTicketFormatted() {
        double amount = getAdditionalChargeForPhysicalTicket();
        return MoneyExtension.formatMoney(amount);
    }

    public List<PhysicalTicketResponseDTO> getAllPhysicalTickets() {
        return ticketRepository.listAll().stream()
                .filter(Ticket::isPhysical)
                .map(ticket -> {
                    var name = "%s %s".formatted(
                            ticket.getOrder().getCustomer().getFirstName(),
                            ticket.getOrder().getCustomer().getLastName());
                    return new PhysicalTicketResponseDTO(ticket.getId(), name, ticket.getOrder().getId());
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public List<PhysicalTicketResponseDTO> getNotYetPrintedPhysicalTickets() {
        return ticketRepository.find(
                "SELECT t FROM Ticket t " +
                        "WHERE t.isPhysical = true " +
                        "AND t.id NOT IN (SELECT p.key FROM PrintedTicketId p)")
                .stream()
                .map(ticket -> {
                    var name = "%s %s".formatted(
                            ticket.getOrder().getCustomer().getFirstName(),
                            ticket.getOrder().getCustomer().getLastName());
                    return new PhysicalTicketResponseDTO(ticket.getId(), name, ticket.getOrder().getId());
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
