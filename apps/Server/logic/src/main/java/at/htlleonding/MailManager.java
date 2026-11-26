package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.OrderRepo;
import at.htlleonding.types.Order;
import at.htlleonding.types.dtos.BulkMailRequestDTO;
import at.htlleonding.types.dtos.BulkMailResponseDTO;
import at.htlleonding.types.dtos.ShopOrderMailDTO;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import at.htlleonding.types.dtos.mails.ActivationMailDTO;
import at.htlleonding.types.dtos.mails.ConfirmationMailDTO;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.NoArgsConstructor;
import lombok.experimental.UtilityClass;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
@NoArgsConstructor
public class MailManager {
    private static final Logger log = LoggerFactory.getLogger(MailManager.class);

    private Mailer mailer;
    private TicketManager ticketManager;
    private OrderManager orderManager;
    private OrderRepo orderRepo;
    private PDFManager pdfManager;
    private AdminManager adminManager;
    private at.htlleonding.repositories.MailConfigRepo mailConfigRepo;
    private EncryptionManager encryptionManager;
    private io.vertx.core.Vertx vertx;

    @ConfigProperty(name = "config.order-url")
    String orderUrl;

    @ConfigProperty(name = "config.web-url", defaultValue = "http://localhost:4200")
    String webUrl;

    @Inject
    public MailManager(Mailer mailer, TicketManager ticketManager, OrderManager orderManager, OrderRepo orderRepo, 
                      PDFManager pdfManager, AdminManager adminManager, 
                      at.htlleonding.repositories.MailConfigRepo mailConfigRepo, 
                      EncryptionManager encryptionManager, io.vertx.core.Vertx vertx) {
        this.mailer = mailer;
        this.ticketManager = ticketManager;
        this.orderManager = orderManager;
        this.orderRepo = orderRepo;
        this.pdfManager = pdfManager;
        this.adminManager = adminManager;
        this.mailConfigRepo = mailConfigRepo;
        this.encryptionManager = encryptionManager;
        this.vertx = vertx;
    }

    private void sendMailDynamic(Mail quarkusMail) {
        sendMailDynamic(quarkusMail, null);
    }

    private void sendMailDynamic(Mail quarkusMail, List<io.vertx.ext.mail.MailAttachment> attachments) {
        at.htlleonding.types.MailConfig dbConfig = mailConfigRepo.findById(1L);
        if (dbConfig == null || dbConfig.getHost() == null || dbConfig.getHost().isEmpty()) {
            mailer.send(quarkusMail);
            return;
        }

        io.vertx.ext.mail.MailConfig config = new io.vertx.ext.mail.MailConfig();
        config.setHostname(dbConfig.getHost());
        config.setPort(dbConfig.getPort() != null ? dbConfig.getPort() : 587);
        config.setUsername(dbConfig.getUsername());
        config.setAuthMethods("DIGEST-MD5 CRAM-SHA256 CRAM-SHA1 CRAM-MD5 PLAIN LOGIN");
        if (dbConfig.getPassword() != null && !dbConfig.getPassword().isEmpty()) {
            config.setPassword(encryptionManager.decrypt(dbConfig.getPassword()));
        }
        
        if (config.getPort() == 587) {
            config.setStarttls(io.vertx.ext.mail.StartTLSOptions.REQUIRED);
        } else if (config.getPort() == 465) {
            config.setSsl(true);
        }

        io.vertx.ext.mail.MailClient client = io.vertx.ext.mail.MailClient.createShared(vertx, config, "dynamic-mail-pool");

        io.vertx.ext.mail.MailMessage message = new io.vertx.ext.mail.MailMessage();
        String from = dbConfig.getFromAddress();
        if (from != null && !from.isEmpty()) {
            if (dbConfig.getFromName() != null && !dbConfig.getFromName().isEmpty()) {
                message.setFrom(dbConfig.getFromName() + " <" + from + ">");
            } else {
                message.setFrom(from);
            }
        }
        if (quarkusMail.getTo() != null && !quarkusMail.getTo().isEmpty()) {
            message.setTo(quarkusMail.getTo());
        }
        
        message.setSubject(quarkusMail.getSubject());
        message.setHtml(quarkusMail.getHtml());
        message.setText(quarkusMail.getText());
        
        if (attachments != null && !attachments.isEmpty()) {
            message.setAttachment(attachments);
        }

        client.sendMail(message).toCompletionStage().toCompletableFuture().join();
    }

    public boolean sendActivationMail(String recipient, ActivationMailDTO dto) {
        var text = Templates
                .activationMail(dto, ticketManager.getAdditionalChargeForPhysicalTicketFormatted(), orderUrl).render();
        sendMailDynamic(Mail.withHtml(recipient,
                String.format("Bestätigen Sie Ihre Reservierung - #%s", dto.order().getId()), text));
        // TODO proper error handling and proper return
        return true;
    }

    public boolean sendConfirmationMail(String recipient, ConfirmationMailDTO dto, String additionalChargeFormatted) {
        var text = Templates.confirmationMail(dto, additionalChargeFormatted)
                .render();

        var mail = Mail.withHtml(recipient, String.format("Ihre Reservierungsbestätigung - #%s", dto.orderID()), text);

        sendMailDynamic(mail.addHeader("charset", "UTF-8"));
        return true;
    }

    /**
     * Send payment confirmation email with bill and ticket PDFs.
     * All data must be prepared before calling this method (within a transaction context).
     * 
     * @param dto Order data for the email
     * @param additionalCharge Additional charge for physical tickets (prepared in transaction)
     * @param additionalChargeFormatted Formatted additional charge string (prepared in transaction)
     * @param ticketDownloads List of digital ticket PDFs (prepared in transaction)
     */
    public boolean sendPaymentConfirmationMail(OrderMailDTO dto, double additionalCharge, 
                                               String additionalChargeFormatted, List<byte[]> ticketDownloads) {
        log.info("Starting payment confirmation email for order: {}", dto.id());

        // Step 1: Check customer email
        if (dto.customer() == null || dto.customer().mailAddress() == null) {
            log.error("Customer or email address is null for order: {}", dto.id());
            throw new IllegalArgumentException("Customer email address is required");
        }
        String recipientEmail = dto.customer().mailAddress().trim().toLowerCase();
        log.info("Recipient email: {}", recipientEmail);

        // Step 2: Generate bill PDF in memory
        log.info("Generating bill PDF in memory for order: {}", dto.id());
        byte[] data;
        try {
            data = pdfManager.generatePDF(dto, additionalCharge, additionalChargeFormatted);
            log.info("Bill PDF generated successfully in memory, size: {} bytes", data.length);
        } catch (Exception e) {
            log.error("Failed to generate bill PDF for order: {}", dto.id(), e);
            throw new RuntimeException("Failed to generate bill PDF: " + e.getMessage(), e);
        }

        // Step 3: Determine if we should attach tickets or provide download link
        int ticketCount = dto.order().tickets().size();
        boolean shouldAttachTickets = ticketCount <= 4;
        String downloadLink = shouldAttachTickets ? "" : String.format("%s/orders", webUrl);
        
        log.info("Order has {} tickets. Will {} tickets and {} download link", 
                ticketCount, 
                shouldAttachTickets ? "attach" : "not attach",
                downloadLink.isEmpty() ? "not provide" : "provide");

        var text = Templates.paymentConfirmationMail(
                        dto,
                        additionalChargeFormatted,
                        downloadLink
                )
                .render();

        // Step 4: Build email with attachments
        var mail = Mail
                .withHtml(recipientEmail,
                        String.format("Ihre Rechnung - #%s", dto.id()), text)
                .addAttachment(String.format("Rechnung_%s.pdf", dto.id()), data, "application/pdf");
        
        List<io.vertx.ext.mail.MailAttachment> attachs = new ArrayList<>();
        io.vertx.ext.mail.MailAttachment attach1 = io.vertx.ext.mail.MailAttachment.create();
        attach1.setName(String.format("Rechnung_%s.pdf", dto.id()));
        attach1.setData(io.vertx.core.buffer.Buffer.buffer(data));
        attach1.setContentType("application/pdf");
        attachs.add(attach1);

        log.info("Added bill PDF attachment");

        // Step 5: Only attach tickets if there are 4 or fewer
        if (shouldAttachTickets && ticketDownloads != null && !ticketDownloads.isEmpty()) {
            log.info("Attaching {} digital ticket PDFs", ticketDownloads.size());
            for (int i = 0; i < ticketDownloads.size(); i++) {
                mail.addAttachment(String.format("Ticket_%s_%d.pdf", dto.id(), i + 1), ticketDownloads.get(i),
                        "application/pdf");
                
                io.vertx.ext.mail.MailAttachment attach2 = io.vertx.ext.mail.MailAttachment.create();
                attach2.setName(String.format("Ticket_%s_%d.pdf", dto.id(), i + 1));
                attach2.setData(io.vertx.core.buffer.Buffer.buffer(ticketDownloads.get(i)));
                attach2.setContentType("application/pdf");
                attachs.add(attach2);

                log.info("Added ticket PDF attachment {}/{}", i + 1, ticketDownloads.size());
            }
        } else if (!shouldAttachTickets) {
            log.info("Skipping ticket attachments ({} tickets > 4). Download link provided in email: {}", ticketCount, downloadLink);
        }

        // Step 6: Send email
        try {
            sendMailDynamic(mail.addHeader("charset", "UTF-8"), attachs);
            log.info("Payment confirmation email sent successfully to: {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send payment confirmation email to: {}", recipientEmail, e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }

        return true;
    }

    public boolean sendDeliveryConfirmationMail(OrderMailDTO dto) {
        var text = Templates.deliveryConfirmationMail(dto).render();
        sendMailDynamic(Mail
                .withHtml(dto.customer().mailAddress().trim().toLowerCase(),
                        String.format("Ihre Abholungsbestätigung - #%s", dto.id()), text)
                .addHeader("charset", "UTF-8"));
        // TODO proper error handling and proper return
        return true;
    }

    public boolean sendCancellationMail(OrderMailDTO dto) {
        try {
            var text = Templates.cancellationMail(dto).render();
            sendMailDynamic(Mail.withHtml(dto.customer().mailAddress().trim().toLowerCase(),
                    String.format("Ihre Stornierung - #%s", dto.id()), text).addHeader("charset", "UTF-8"));
        } catch (Exception e) {
            return false;
        }
        // TODO proper error handling and proper return
        return true;
    }

    public boolean sendDeletionMail(OrderMailDTO dto) {
        try {
            var text = Templates.deletionMail(dto).render();
            sendMailDynamic(Mail
                    .withHtml(dto.customer().mailAddress().trim().toLowerCase(),
                            String.format("Löschung Ihrer Bestellung - #%s", dto.id()), text)
                    .addHeader("charset", "UTF-8"));
        } catch (Exception e) {
            return false;
        }
        // TODO proper error handling and proper return
        return true;
    }

    /**
     * Send bulk emails to customers based on order status filter.
     * Optionally includes bill attachments for PAID orders.
     */
    public BulkMailResponseDTO sendBulkMail(BulkMailRequestDTO request) {
        log.info("Starting bulk mail send: subject='{}', targetStatuses={}, includeBills={}", 
                request.subject(), request.targetStatuses(), request.includeBills());
        
        // Get filtered orders
        List<Order> orders = orderRepo.findByStatuses(request.targetStatuses());
        log.info("Found {} orders matching criteria", orders.size());
        
        int successCount = 0;
        int failureCount = 0;
        List<UUID> failedOrderIds = new ArrayList<>();
        
        for (Order order : orders) {
            try {
                // Skip if customer or email is null
                if (order.getCustomer() == null || order.getCustomer().getMailAddress() == null) {
                    log.warn("Skipping order {} - customer or email is null", order.getId());
                    failureCount++;
                    failedOrderIds.add(order.getId());
                    continue;
                }
                
                String recipientEmail = order.getCustomer().getMailAddress().trim().toLowerCase();
                log.debug("Sending email to: {} for order: {}", recipientEmail, order.getId());
                
                // Replace template variables
                String fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();
                String personalizedSubject = request.subject()
                        .replace("{{fullName}}", fullName)
                        .replace("{{orderId}}", order.getId().toString());
                
                String personalizedContent = request.content()
                        .replace("{{fullName}}", fullName)
                        .replace("{{orderId}}", order.getId().toString());
                
                // Convert plain text content to HTML with proper line breaks
                String htmlContent = personalizedContent.replace("\n", "<br>");
                
                // Build email
                Mail mail = Mail.withHtml(recipientEmail, personalizedSubject, htmlContent)
                        .addHeader("charset", "UTF-8");
                
                List<io.vertx.ext.mail.MailAttachment> attachs = new ArrayList<>();

                // Add bill attachment only for PAID orders if requested
                if (request.includeBills() && order.getStatus() == OrderStatus.PAID) {
                    try {
                        log.info("Generating bill PDF in memory for order: {}", order.getId());
                        double additionalCharge = ticketManager.getAdditionalChargeForPhysicalTicket();
                        String additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
                        OrderMailDTO mailDto = adminManager.getOrderMailDto(order.getId());
                        byte[] billData = pdfManager.generatePDF(mailDto, additionalCharge, additionalChargeFormatted);
                        
                        mail.addAttachment(
                                String.format("Rechnung_%s.pdf", order.getId()), 
                                billData, 
                                "application/pdf"
                        );
                        
                        io.vertx.ext.mail.MailAttachment attachBill = io.vertx.ext.mail.MailAttachment.create();
                        attachBill.setName(String.format("Rechnung_%s.pdf", order.getId()));
                        attachBill.setData(io.vertx.core.buffer.Buffer.buffer(billData));
                        attachBill.setContentType("application/pdf");
                        attachs.add(attachBill);

                        log.info("Successfully added bill attachment for order: {}", order.getId());
                    } catch (Exception e) {
                        log.error("Failed to attach bill for order: {}", order.getId(), e);
                        // Continue sending email without attachment
                    }
                }
                
                // Send email
                sendMailDynamic(mail, attachs);
                successCount++;
                log.debug("Email sent successfully for order: {}", order.getId());
                
            } catch (Exception e) {
                log.error("Failed to send email for order: {}", order.getId(), e);
                failureCount++;
                failedOrderIds.add(order.getId());
            }
        }
        
        log.info("Bulk mail send completed: total={}, success={}, failure={}", 
                orders.size(), successCount, failureCount);
        
        return new BulkMailResponseDTO(
                orders.size(),
                successCount,
                failureCount,
                failedOrderIds
        );
    }

    public void sendVerificationCode(String email, String code) {
        var text = Templates.verificationCodeMail(code).render();
        sendMailDynamic(Mail.withHtml(email, "Ihr Bestätigungscode", text).addHeader("charset", "UTF-8"));
    }

    public void sendShopOrderMail(ShopOrderMailDTO dto) {
        String subject = dto.isUpgrade()
                ? "Ihr Ticket-Upgrade wurde entgegengenommen"
                : "Ihre Bestellung im Ball-Shop";
        var text = Templates.shopOrderMail(dto).render();
        try {
            sendMailDynamic(Mail.withHtml(dto.recipientEmail(), subject, text).addHeader("charset", "UTF-8"));
            log.info("Shop order mail sent to: {}", dto.recipientEmail());
        } catch (Exception e) {
            log.error("Failed to send shop order mail to: {}", dto.recipientEmail(), e);
        }
    }

    @CheckedTemplate
    @UtilityClass
    public static class Templates {
        public static native TemplateInstance activationMail(ActivationMailDTO data, String additionalChargeForPhysicalTicketsFormatted, String orderUrl);

        public static native TemplateInstance confirmationMail(ConfirmationMailDTO data, String additionalChargeForPhysicalTicketsFormatted);

        public static native TemplateInstance paymentConfirmationMail(
                OrderMailDTO dto,
                String additionalChargeForPhysicalTicketsFormatted,
                String downloadPdfUrl
        );

        public static native TemplateInstance cancellationMail(OrderMailDTO dto);

        public static native TemplateInstance deletionMail(OrderMailDTO dto);

        public static native TemplateInstance deliveryConfirmationMail(OrderMailDTO dto);

        public static native TemplateInstance shopOrderMail(ShopOrderMailDTO dto);

        public static native TemplateInstance verificationCodeMail(String code);
    }
}