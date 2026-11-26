package at.htlleonding;

import at.htlleonding.exceptions.PDFCreationException;
import at.htlleonding.extensions.DateExtension;
import at.htlleonding.extensions.TicketPriceExtension;
import at.htlleonding.types.dtos.admin.OrderMailDTO;
import com.itextpdf.html2pdf.HtmlConverter;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.experimental.UtilityClass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class PDFManager {
    private TicketManager ticketManager;
    private static final Logger logger = LoggerFactory.getLogger(PDFManager.class);

    /**
     * Generate a bill PDF in memory and return it as a byte array.
     * 
     * @param dto Order data for the bill
     * @param additionalCharge Additional charge for physical tickets
     * @param additionalChargeFormatted Formatted additional charge string
     * @return PDF as byte array
     * @throws PDFCreationException if PDF generation fails
     */
    public byte[] generatePDF(OrderMailDTO dto, double additionalCharge, String additionalChargeFormatted) {
        try {
            logger.info("Starting PDF generation for order: {}", dto.id());

            String currentDate = DateExtension.formatDateTime(LocalDateTime.now());
            logger.info("Current date: {}", currentDate);

            logger.info("Rendering HTML template...");
            double totalRevenue = TicketPriceExtension.calculateTotalPrice(dto, additionalCharge);
            String html = Templates.paymentConfirmationPDF(dto, currentDate, totalRevenue, additionalChargeFormatted).render();
            logger.info("HTML rendered successfully. Length: {}", html.length());

            logger.info("Converting HTML to PDF in memory...");
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                HtmlConverter.convertToPdf(html, baos);
                byte[] pdfBytes = baos.toByteArray();
                logger.info("PDF generated successfully in memory, size: {} bytes", pdfBytes.length);
                return pdfBytes;
            }
        } catch (IOException e) {
            logger.error("IOException during PDF generation for order {}: {}", dto.id(), e.getMessage(), e);
            throw new PDFCreationException("Failed to generate PDF due to I/O error: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error during PDF generation for order {}: {}", dto.id(), e.getMessage(), e);
            throw new PDFCreationException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    @CheckedTemplate
    @UtilityClass
    public static class Templates {
        public static native TemplateInstance paymentConfirmationPDF(
                OrderMailDTO dto,
                String currentDate,
                double totalRevenue,
                String additionalChargeForPhysicalTicketsFormatted
        );
    }
}
