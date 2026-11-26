package at.htlleonding;

import at.htlleonding.enums.PageType;
import at.htlleonding.repositories.DesignElementRepo;
import at.htlleonding.repositories.DesignPageRepo;
import at.htlleonding.repositories.TicketDesignRepo;
import at.htlleonding.types.DesignElement;
import at.htlleonding.types.DesignPage;
import at.htlleonding.types.Ticket;
import at.htlleonding.types.TicketDesign;
import at.htlleonding.types.dtos.TicketDesignDTO;
import at.htlleonding.types.dtos.TicketDesignResponseDTO;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.extgstate.PdfExtGState;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class TicketDesignManager {
    private TicketDesignRepo ticketDesignRepo;
    private DesignElementRepo designElementRepo;
    private DesignPageRepo designPageRepo;
    private DataManager dataManager;

    private static final Logger log = LoggerFactory.getLogger(TicketDesignManager.class);

    @Transactional
    public void toggleActiveDesign(UUID id) {
        TicketDesign design = ticketDesignRepo.findById(id);
        TicketDesign oldDesign = ticketDesignRepo.find("active = true").firstResult();
        if (design != null) {
            if (oldDesign != null) {
                oldDesign.setActive(false);
                ticketDesignRepo.persist(oldDesign);
            }
            design.setActive(true);
            ticketDesignRepo.persist(design);
        } else {
            throw new IllegalArgumentException("Design not found");
        }
    }

    @Transactional
    public TicketDesignResponseDTO saveDesign(TicketDesignDTO dto) {
        List<DesignElement> frontPageElements = dto.frontPage().elements().stream()
                .map(this::designElementFromDTO)
                .collect(Collectors.toCollection(ArrayList::new));
        List<DesignElement> backPageElements = dto.backPage().elements().stream()
                .map(this::designElementFromDTO)
                .collect(Collectors.toCollection(ArrayList::new));

        // Persist all design elements first
        for (DesignElement element : frontPageElements) {
            designElementRepo.persist(element);
        }
        for (DesignElement element : backPageElements) {
            designElementRepo.persist(element);
        }

        List<DesignPage> pages = new ArrayList<>();
        pages.add(new DesignPage(frontPageElements, PageType.FRONT));
        pages.add(new DesignPage(backPageElements, PageType.BACK));
        TicketDesign design = new TicketDesign(dto.name(), dto.width(), dto.height(), pages);

        ticketDesignRepo.persist(design);

        for (DesignPage page : pages) {
            page.setTicketDesign(design);
            designPageRepo.persist(page);
        }

        if (ticketDesignRepo.count() == 1) {
            design.setActive(true);
            ticketDesignRepo.persist(design);
        }

        return convertToResponseDTO(design);
    }

    public List<TicketDesignResponseDTO> getAllDesigns() {
        return ticketDesignRepo.listAll().stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private TicketDesignResponseDTO convertToResponseDTO(TicketDesign design) {
        List<TicketDesignResponseDTO.DesignElementResponseDTO> frontPageElements = design.getPages().stream()
                .filter(page -> page.getType() == PageType.FRONT)
                .flatMap(page -> page.getElements().stream())
                .map(this::convertElementToResponseDTO)
                .collect(Collectors.toCollection(ArrayList::new));

        List<TicketDesignResponseDTO.DesignElementResponseDTO> backPageElements = design.getPages().stream()
                .filter(page -> page.getType() == PageType.BACK)
                .flatMap(page -> page.getElements().stream())
                .map(this::convertElementToResponseDTO)
                .collect(Collectors.toCollection(ArrayList::new));

        return new TicketDesignResponseDTO(
                design.getId(),
                design.getName(),
                design.getWidth(),
                design.getHeight(),
                new TicketDesignResponseDTO.TicketPageDTO(frontPageElements),
                new TicketDesignResponseDTO.TicketPageDTO(backPageElements),
                design.getCreatedAt(),
                design.getUpdatedAt(),
                design.getActive());
    }

    private TicketDesignResponseDTO.DesignElementResponseDTO convertElementToResponseDTO(DesignElement element) {
        return new TicketDesignResponseDTO.DesignElementResponseDTO(
                element.getId().toString(),
                element.getType(),
                element.getFiller(),
                element.getX(),
                element.getY(),
                element.getWidth(),
                element.getHeight(),
                element.getContent(),
                element.getFontSize(),
                element.getFontWeight(),
                element.getColor(),
                element.getIsDynamic(),
                element.getImageData(),
                element.getVisible(),
                element.getZIndex(),
                element.getOpacity(),
                element.getBorderRadius(),
                element.getBlurIntensity(),
                element.getBackgroundColor(),
                element.getLayer(),
                element.getRotation()
        );
    }

    public TicketDesignResponseDTO getDesignById(UUID id) {
        TicketDesign design = ticketDesignRepo.findById(id);
        if (design == null) {
            throw new IllegalArgumentException("Design not found");
        }

        return convertToResponseDTO(design);
    }

    @Transactional
    public TicketDesignResponseDTO updateDesign(UUID id, TicketDesignDTO dto) {
        TicketDesign existingDesign = ticketDesignRepo.findById(id);
        if (existingDesign == null) {
            return null;
        }

        // Delete old elements
        for (DesignPage page : existingDesign.getPages()) {
            for (DesignElement element : page.getElements()) {
                designElementRepo.delete(element);
            }
            designPageRepo.delete(page);
        }

        // Create new elements
        List<DesignElement> frontPageElements = dto.frontPage().elements().stream()
                .map(this::designElementFromDTO)
                .collect(Collectors.toCollection(ArrayList::new));
        List<DesignElement> backPageElements = dto.backPage().elements().stream()
                .map(this::designElementFromDTO)
                .collect(Collectors.toCollection(ArrayList::new));

        // Persist all design elements
        for (DesignElement element : frontPageElements) {
            designElementRepo.persist(element);
        }
        for (DesignElement element : backPageElements) {
            designElementRepo.persist(element);
        }

        // Create new pages
        List<DesignPage> pages = new ArrayList<>();
        pages.add(new DesignPage(frontPageElements, PageType.FRONT));
        pages.add(new DesignPage(backPageElements, PageType.BACK));

        // Update design
        existingDesign.setName(dto.name());
        existingDesign.setWidth(dto.width());
        existingDesign.setHeight(dto.height());
        existingDesign.setPages(pages);
        existingDesign.setUpdatedAt(LocalDateTime.now());

        ticketDesignRepo.persist(existingDesign);

        for (DesignPage page : pages) {
            page.setTicketDesign(existingDesign);
            designPageRepo.persist(page);
        }

        return convertToResponseDTO(existingDesign);
    }

    @Transactional
    public boolean deleteDesign(UUID id) {
        TicketDesign removed = ticketDesignRepo.findById(id);
        if (removed != null) {
            ticketDesignRepo.delete(removed);
            return true;
        }
        return false;
    }

    private DesignElement designElementFromDTO(TicketDesignDTO.DesignElementDTO element) {
        return new DesignElement(
                element.type(),
                element.filler().orElse(null),
                null, // designPage will be set later
                element.content(),
                element.x(),
                element.y(),
                element.width(),
                element.height(),
                element.rotation(),
                element.zIndex(),
                element.fontSize(),
                element.fontWeight(),
                element.color(),
                element.isDynamic(),
                element.visible(),
                element.imageData(),
                element.opacity(),
                element.borderRadius(),
                element.blurIntensity(),
                element.backgroundColor(),
                element.layer()
        );
    }

    /*
     * Generate a PDF ticket from the active design
     *
     * @param ticket The Ticket to generate a PDF from
     *
     * @return The PDF ticket as a byte array
     */
    public byte[] generateTicketPdf(Ticket ticket) {
        TicketDesign design = ticketDesignRepo.find("active = true").firstResult();
        if (design == null) {
            throw new IllegalArgumentException("No active design found");
        }

        log.info("Generating ticket PDF for ticket {}", ticket.getId());
        log.info("Design: {}", design.getName());
        log.info("Design dimensions: {}x{}", design.getWidth(), design.getHeight());
        log.info("Design pages count: {}", design.getPages().size());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Create PDF document with custom page size based on design dimensions
            // Convert design dimensions from pixels to points (1 pixel ≈ 0.75 points)
            float ticketWidth = design.getWidth() * 0.75f;
            float ticketHeight = design.getHeight() * 0.75f;

            // Create a portrait page with original ticket dimensions
            // Both front and back will be scaled to 50% and placed side by side
            float pageWidth = ticketWidth;
            float pageHeight = ticketHeight;
            PageSize customPageSize = new PageSize(pageWidth, pageHeight);

            log.info("PDF page size: {}x{} points (portrait format, designs scaled to 50%)", pageWidth, pageHeight);

            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);

            // Add the first page explicitly
            pdfDoc.addNewPage(customPageSize);

            Document document = new Document(pdfDoc, customPageSize);
            document.setMargins(0, 0, 0, 0); // No margins for precise positioning

            // Process front page on the left half at 50% scale
            DesignPage frontPage = design.getPages().stream()
                    .filter(page -> page.getType() == PageType.FRONT)
                    .findFirst()
                    .orElse(null);

            if (frontPage != null) {
                log.info("Processing front page with {} elements on left half (50% scale)", frontPage.getElements().size());
                renderPageScaled(document, pdfDoc, frontPage, ticket, ticketWidth, ticketHeight, 0, 0, 0.5f);
            } else {
                log.info("No front page found");
            }

            // Process back page on the right half at 50% scale
            DesignPage backPage = design.getPages().stream()
                    .filter(page -> page.getType() == PageType.BACK)
                    .findFirst()
                    .orElse(null);

            if (backPage != null) {
                log.info("Processing back page with {} elements on right half (50% scale)", backPage.getElements().size());
                renderPageScaled(document, pdfDoc, backPage, ticket, ticketWidth, ticketHeight, ticketWidth / 2, 0,
                        0.5f);
            } else {
                log.info("No back page found");
            }

            // Draw a vertical line separating the two pages (top half only)
            PdfCanvas canvas = new PdfCanvas(pdfDoc.getLastPage());
            canvas.setStrokeColor(DeviceRgb.BLACK);
            canvas.setLineWidth(1f);
            canvas.moveTo(ticketWidth / 2, pageHeight / 2);
            canvas.lineTo(ticketWidth / 2, pageHeight);
            canvas.stroke();
            log.info("Separator line drawn at x={} from y={} to y={}", ticketWidth / 2, pageHeight / 2, pageHeight);

            // Add instructions image to the bottom half of the page
            try (InputStream instructionsStream = getClass().getClassLoader().getResourceAsStream("instructions.png")) {
                if (instructionsStream != null) {
                    byte[] instructionsBytes = instructionsStream.readAllBytes();
                    Image instructionsImage = new Image(ImageDataFactory.create(instructionsBytes));

                    // Calculate dimensions for bottom half
                    float bottomHalfWidth = pageWidth;
                    float bottomHalfHeight = pageHeight / 2;

                    // Scale image to fit within bottom half while maintaining aspect ratio
                    float imgWidth = instructionsImage.getImageWidth();
                    float imgHeight = instructionsImage.getImageHeight();
                    float imgAspectRatio = imgWidth / imgHeight;
                    float targetAspectRatio = bottomHalfWidth / bottomHalfHeight;

                    float finalWidth, finalHeight;
                    if (imgAspectRatio > targetAspectRatio) {
                        finalWidth = bottomHalfWidth;
                        finalHeight = bottomHalfWidth / imgAspectRatio;
                    } else {
                        finalHeight = bottomHalfHeight;
                        finalWidth = bottomHalfHeight * imgAspectRatio;
                    }

                    // Center the image in the bottom half
                    float imgX = (bottomHalfWidth - finalWidth) / 2;
                    float imgY = (bottomHalfHeight - finalHeight) / 2;

                    Rectangle imgRect = new Rectangle(imgX, imgY, finalWidth, finalHeight);
                    canvas.addXObjectFittedIntoRectangle(instructionsImage.getXObject(), imgRect);

                    log.info("Instructions image added to bottom half at ({},{}) with size {}x{}", imgX, imgY, finalWidth, finalHeight);
                } else {
                    log.error("Instructions image not found in resources");
                }
            } catch (Exception e) {
                log.error("Error loading instructions image: {}", e.getMessage());

                for (StackTraceElement ste : e.getStackTrace()) {
                    log.error("{}", ste);
                }
            }

            document.close();
            log.info("PDF generation completed, size: {} bytes", baos.size());
            return baos.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private void renderPageScaled(Document document, PdfDocument pdfDoc, DesignPage page, Ticket ticket,
                                  float pageWidth,
                                  float pageHeight, float xOffset, float yOffset, float scale) {
        PdfCanvas canvas = new PdfCanvas(pdfDoc.getLastPage());

        log.info("Rendering page with {} elements at offset ({},{}) with scale {}", page.getElements().size(), xOffset, yOffset, scale);

        // Sort elements by z-index for proper layering
        page.getElements().stream()
                .filter(element -> element.getVisible() != null && element.getVisible())
                .sorted((a, b) -> {
                    Integer aIndex = a.getZIndex();
                    Integer bIndex = b.getZIndex();
                    return Integer.compare(aIndex != null ? aIndex : 0, bIndex != null ? bIndex : 0);
                })
                .forEach(element -> {
                    try {
                        log.info("Rendering element: {} at ({},{}) with scale {}", element.getType(), element.getX(), element.getY(), scale);
                        renderElementScaled(canvas, document, element, ticket, pageWidth, pageHeight, xOffset, yOffset,
                                scale);
                    } catch (Exception e) {
                        // Log error but continue rendering other elements
                        log.error("Error rendering element {}: {}", element.getId(), e.getMessage());
                        for (StackTraceElement ste : e.getStackTrace()) {
                            log.error("{}", ste);
                        }
                    }
                });
    }

    private void renderElementScaled(PdfCanvas canvas, Document document, DesignElement element, Ticket ticket,
                                     float pageWidth, float pageHeight, float xOffset, float yOffset, float scale) throws IOException {
        // Convert pixel coordinates to PDF points and flip Y coordinate (PDF origin is
        // bottom-left)
        // Apply scaling to position and dimensions
        float x = (element.getX() * 0.75f * scale) + xOffset;
        float y = pageHeight - ((element.getY() * 0.75f * scale) + (element.getHeight() * 0.75f * scale)) + yOffset;
        float width = element.getWidth() * 0.75f * scale;
        float height = element.getHeight() * 0.75f * scale;

        log.info("Element coordinates (scaled): x={}, y={}, width={}, height={}", x, y, width, height);

        switch (element.getType()) {
            case TEXT:
                renderTextElement(canvas, document, element, ticket, x, y, width, height, scale);
                break;
            case FIELD:
                renderFieldElement(canvas, document, element, ticket, x, y, width, height, scale);
                break;
            case IMAGE:
                renderImageElement(canvas, element, x, y, width, height);
                break;
            case QR:
                renderQRElement(canvas, element, ticket, x, y, width, height);
                break;
            case BLUR:
                renderBlurElement(canvas, element, x, y, width, height, scale);
                break;
        }
    }

    private void renderFieldElement(PdfCanvas canvas, Document document, DesignElement element, Ticket ticket, float x,
                                    float y, float width, float height, float scale) throws IOException {
        String content = getElementContent(element, ticket);
        if (content == null || content.trim().isEmpty()) {
            log.info("Skipping empty text element");
            return;
        }

        log.info("Rendering text: '{}' at ({},{})", content, x, y);

        try {
            // Set up font with proper weight
            PdfFont font = getFontWithWeight(element.getFontWeight());
            float fontSize = element.getFontSize() != null ? element.getFontSize() * 0.75f * scale : 12f * scale;

            // Parse color
            DeviceRgb color = parseColor(element.getColor());

            // Get the actual text content to render
            String textToRender = switch (element.getFiller()) {
                case CODE -> "#" + ticket.getId().toString();
                case DATE -> dataManager.getData().getOnDate().toString().split(" ")[0];
                case TIME -> dataManager.getData().getSchedule().getFirst().getStart().toString().split(" ")[1];
                case NAME ->
                        ticket.getOrder().getCustomer().getFirstName() + " " + ticket.getOrder().getCustomer().getLastName();
                case ORDERNUMBER -> ticket.getOrder().getId().toString();
                default -> content;
            };

            // Calculate text dimensions for centering
            float textWidth = font.getWidth(textToRender, fontSize);
            float textHeight = fontSize;

            // Center the text within the element bounds
            float textX = x + (width - textWidth) / 2;
            float textY = y + (height - textHeight) / 2 + textHeight * 0.3f; // Adjust for baseline

            // Use canvas to draw text directly
            canvas.beginText();
            canvas.setFontAndSize(font, fontSize);
            canvas.setFillColor(color);
            canvas.moveText(textX, textY);
            canvas.showText(textToRender);
            canvas.endText();

            log.info("Text rendered successfully");

        } catch (Exception e) {
            log.error("Error rendering text element: {}", e.getMessage());
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
        }
    }

    private void renderTextElement(PdfCanvas canvas, Document document, DesignElement element, Ticket ticket, float x,
                                   float y, float width, float height, float scale) throws IOException {
        String content = getElementContent(element, ticket);
        if (content == null || content.trim().isEmpty()) {
            log.info("Skipping empty text element");
            return;
        }

        log.info("Rendering text: '{}' at ({},{})", content, x, y);

        try {
            // Set up font with proper weight
            PdfFont font = getFontWithWeight(element.getFontWeight());
            float fontSize = element.getFontSize() != null ? element.getFontSize() * 0.75f * scale : 12f * scale;

            // Parse color
            DeviceRgb color = parseColor(element.getColor());

            // Calculate text dimensions for centering
            float textWidth = font.getWidth(content, fontSize);
            float textHeight = fontSize;

            // Center the text within the element bounds
            float textX = x + (width - textWidth) / 2;
            float textY = y + (height - textHeight) / 2 + textHeight * 0.3f; // Adjust for baseline

            // Use canvas to draw text directly
            canvas.beginText();
            canvas.setFontAndSize(font, fontSize);
            canvas.setFillColor(color);
            canvas.moveText(textX, textY);
            canvas.showText(content);
            canvas.endText();

            log.info("Text rendered successfully");

        } catch (Exception e) {
            log.error("Error rendering text element: {}", e.getMessage());
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
        }
    }

    private void renderImageElement(PdfCanvas canvas, DesignElement element, float x, float y, float width,
                                    float height) {
        if (element.getImageData() == null || element.getImageData().trim().isEmpty()) {
            log.info("Skipping empty image element");
            return;
        }

        log.info("Rendering image at ({},{}) with target size {}x{}", x, y, width, height);

        try {
            String base64Data = element.getImageData();
            log.info("Original image data length: {}", base64Data.length());

            // Handle data URL format: data:image/type;base64,actualdata
            if (base64Data.startsWith("data:")) {
                int commaIndex = base64Data.indexOf(",");
                if (commaIndex != -1) {
                    base64Data = base64Data.substring(commaIndex + 1);
                    log.info("Stripped data URL prefix, new length: {}", base64Data.length());
                } else {
                    log.info("Warning: Data URL format detected but no comma found");
                }
            }

            base64Data = base64Data.replaceAll("\\s", "");

            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            log.info("Successfully decoded {} bytes of image data", imageBytes.length);

            Image image = new Image(ImageDataFactory.create(imageBytes));

            float originalWidth = image.getImageWidth();
            float originalHeight = image.getImageHeight();
            log.info("Original image dimensions: {}x{}", originalWidth, originalHeight);

            float targetAspectRatio = width / height;
            float imageAspectRatio = originalWidth / originalHeight;

            float imageRectWidth, imageRectHeight;
            float imageRectX, imageRectY;

            if (imageAspectRatio > targetAspectRatio) {
                imageRectHeight = height;
                imageRectWidth = height * imageAspectRatio;
                imageRectX = x - (imageRectWidth - width) / 2;
                imageRectY = y;
            } else {
                imageRectWidth = width;
                imageRectHeight = width / imageAspectRatio;
                imageRectX = x;
                imageRectY = y - (imageRectHeight - height) / 2;
            }

            log.info("Image rect: ({},{}) {}x{}", imageRectX, imageRectY, imageRectWidth, imageRectHeight);

            canvas.saveState();

            canvas.rectangle(x, y, width, height);
            canvas.clip();
            canvas.endPath();

            // Add the image fitted into the calculated rectangle (which may extend beyond
            // clipping area)
            Rectangle imageRect = new Rectangle(imageRectX, imageRectY, imageRectWidth, imageRectHeight);
            canvas.addXObjectFittedIntoRectangle(image.getXObject(), imageRect);

            // Restore graphics state to remove clipping
            canvas.restoreState();

            log.info("Image rendered and fitted into rectangle ({},{}) with size {}x{}", x, y, width, height);

        } catch (Exception e) {
            log.error("Error rendering image: {}", e.getMessage());
            for (StackTraceElement ste : e.getStackTrace()) {
                log.error("{}", ste);
            }

            // Fallback: render a placeholder rectangle
            log.info("Rendering placeholder rectangle instead");
            canvas.setFillColor(new DeviceRgb(0.9f, 0.9f, 0.9f)); // Light gray
            canvas.rectangle(x, y, width, height);
            canvas.fill();
        }
    }

    private void renderQRElement(PdfCanvas canvas, DesignElement element, Ticket ticket, float x, float y, float width,
                                 float height) {
        String qrContent = ticket.getId().toString();

        try {
            // Generate QR code using ZXing
            QRCodeWriter qrCodeWriter = new com.google.zxing.qrcode.QRCodeWriter();
            int qrSize = (int) Math.min(width, height);
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.MARGIN, 0);
            BitMatrix bitMatrix = qrCodeWriter.encode(qrContent, BarcodeFormat.QR_CODE, qrSize, qrSize, hints);

            // Calculate QR code dimensions to center it within the container
            float qrCodeWidth = qrSize;
            float qrCodeHeight = qrSize;
            
            // Calculate offset to center the QR code
            float qrOffsetX = (width - qrCodeWidth) / 2;
            float qrOffsetY = (height - qrCodeHeight) / 2;

            float cellWidth = qrCodeWidth / (float) bitMatrix.getWidth();
            float cellHeight = qrCodeHeight / (float) bitMatrix.getHeight();

            if (element.getBackgroundColor() != null && !element.getBackgroundColor().trim().isEmpty()) {
                canvas.setFillColor(parseColor(element.getBackgroundColor()));
            } else {
                canvas.setFillColor(DeviceRgb.WHITE);
            }

            canvas.roundRectangle(x - 2, y - 2, width + 4, height + 4, 3);
            canvas.fill();

            if (element.getColor() != null && !element.getColor().trim().isEmpty()) {
                canvas.setFillColor(parseColor(element.getColor()));
            } else {
                canvas.setFillColor(DeviceRgb.BLACK);
            }

            for (int i = 0; i < bitMatrix.getWidth(); i++) {
                for (int j = 0; j < bitMatrix.getHeight(); j++) {
                    if (bitMatrix.get(i, j)) {
                        // Apply centering offset to cell positions
                        float cellX = x + qrOffsetX + i * cellWidth;
                        float cellY = y + qrOffsetY + (bitMatrix.getHeight() - 1 - j) * cellHeight; // Flip Y
                        canvas.rectangle(cellX, cellY, cellWidth, cellHeight);
                        canvas.fill();
                    }
                }
            }

            log.info("QR Code generated and rendered for: {} (centered with offset: {}, {})", qrContent, qrOffsetX, qrOffsetY);

        } catch (com.google.zxing.WriterException e) {
            log.error("Error generating QR code: {}", e.getMessage());
            // Fallback: draw a gray rectangle
            canvas.setFillColor(new DeviceRgb(0.8f, 0.8f, 0.8f));
            canvas.rectangle(x, y, width, height);
            canvas.fill();

            // Add error text
            try {
                canvas.setFillColor(DeviceRgb.BLACK);
                PdfFont font = PdfFontFactory.createFont();
                canvas.beginText()
                        .setFontAndSize(font, 8)
                        .moveText(x + 5, y + height / 2)
                        .showText("QR Error")
                        .endText();
            } catch (IOException fontException) {
                // Ignore font error
            }
        }
    }

    private void renderBlurElement(PdfCanvas canvas, DesignElement element, float x, float y, float width,
                                   float height, float scale) {
        DeviceRgb backgroundColor = parseColor(element.getBackgroundColor());

        float opacity = 1.0f;
        if (element.getOpacity() != null) {
            log.info("Blur element opacity: {}", element.getOpacity());
            opacity = element.getOpacity() / 100.0f;
        }

        float blurIntensity = 0.0f;
        if (element.getBlurIntensity() != null) {
            blurIntensity = element.getBlurIntensity();
        }

        PdfExtGState gState = new PdfExtGState();
        gState.setFillOpacity(opacity);

        canvas.saveState();
        canvas.setExtGState(gState);
        canvas.setFillColor(backgroundColor);

        if (blurIntensity > 0) {
            float blurOpacity = opacity;
            gState.setFillOpacity(blurOpacity);
            canvas.setExtGState(gState);

            int blurSteps = (int) (blurIntensity / 2);
            for (int i = 0; i < blurSteps; i++) {
                float offset = i * 0.5f * scale;

                if (element.getBorderRadius() != null && element.getBorderRadius() > 0) {
                    float radius = element.getBorderRadius() / 2 * scale;
                    canvas.roundRectangle(x - offset, y - offset, width + 2 * offset, height + 2 * offset, radius);
                } else {
                    canvas.rectangle(x - offset, y - offset, width + 2 * offset, height + 2 * offset);
                }
                canvas.fill();
            }
        }
        canvas.fill();

        canvas.restoreState();

        log.info("Blur element rendered with opacity: {} and blur intensity: {}", opacity, blurIntensity);
    }

    private String getElementContent(DesignElement element, Ticket ticket) {
        String content = element.getContent();

        // Handle dynamic content based on filler type
        if (element.getIsDynamic() != null && element.getIsDynamic() && element.getFiller() != null) {
            String toReturn = switch (element.getFiller()) {
                case CODE -> ticket.getId().toString();
                case DATE -> LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                case TIME -> LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
                default -> null;
            };

            if (toReturn != null) {
                return toReturn;
            }
        }

        return content;
    }

    private DeviceRgb parseColor(String colorString) {
        if (colorString == null || colorString.trim().isEmpty()) {
            return new DeviceRgb(0, 0, 0); // Default to black
        }

        try {
            // Remove # if present
            if (colorString.startsWith("#")) {
                colorString = colorString.substring(1);
            }

            // Parse hex color
            int rgb = Integer.parseInt(colorString, 16);
            float r = ((rgb >> 16) & 0xFF) / 255.0f;
            float g = ((rgb >> 8) & 0xFF) / 255.0f;
            float b = (rgb & 0xFF) / 255.0f;

            return new DeviceRgb(r, g, b);
        } catch (NumberFormatException e) {
            return new DeviceRgb(0, 0, 0); // Default to black on parse error
        }
    }

    private PdfFont getFontWithWeight(String fontWeight) throws IOException {
        // iText's built-in fonts support normal and bold
        // For numeric weights, we'll map them to normal (< 600) or bold (>= 600)
        if (fontWeight == null || fontWeight.trim().isEmpty()) {
            return PdfFontFactory.createFont();
        }

        try {
            // Check if it's a numeric weight
            int weight = Integer.parseInt(fontWeight);
            // Weights 600 and above are considered bold
            if (weight >= 600) {
                return PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
            } else {
                return PdfFontFactory.createFont();
            }
        } catch (NumberFormatException e) {
            // It's a string weight like "bold" or "normal"
            if ("bold".equalsIgnoreCase(fontWeight)) {
                return PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
            } else {
                return PdfFontFactory.createFont();
            }
        }
    }
}