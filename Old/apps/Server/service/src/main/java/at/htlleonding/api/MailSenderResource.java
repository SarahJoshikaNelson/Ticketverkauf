package at.htlleonding.api;

import at.htlleonding.AiManager;
import at.htlleonding.MailManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.BulkMailRequestDTO;
import at.htlleonding.types.dtos.BulkMailResponseDTO;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.StringReader;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Path("/api/v2/mail-sender")
@RequiredArgsConstructor
public class MailSenderResource {
    private final MailManager mailManager;
    private final AiManager aiManager;
    private static final Logger log = LoggerFactory.getLogger(MailSenderResource.class);

    @POST
    @Path("/send")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response sendBulkMail(BulkMailRequestDTO request) {
        try {
            log.info("Bulk mail request received: subject='{}', targetStatuses={}, includeBills={}", 
                    request.subject(), request.targetStatuses(), request.includeBills());
            
            // Validate request
            if (request.subject() == null || request.subject().trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Subject is required")
                        .build();
            }
            
            if (request.content() == null || request.content().trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Email content is required")
                        .build();
            }
            
            BulkMailResponseDTO response = mailManager.sendBulkMail(request);
            
            log.info("Bulk mail send completed: totalRecipients={}, success={}, failure={}", 
                    response.totalRecipients(), response.successCount(), response.failureCount());
            
            return Response.ok(response).build();
            
        } catch (Exception e) {
            log.error("Error processing bulk mail request", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to process bulk mail request: " + e.getMessage())
                    .build();
        }
    }

    @GET
    @Path("/available-statuses")
    @AdminOnly
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAvailableStatuses() {
        try {
            List<String> statuses = Arrays.stream(OrderStatus.values())
                    .filter(status -> status != OrderStatus.CANCELLED) // Exclude cancelled
                    .map(Enum::name)
                    .collect(Collectors.toList());
            
            return Response.ok(statuses).build();
        } catch (Exception e) {
            log.error("Error retrieving available statuses", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to retrieve available statuses")
                    .build();
        }
    }

    @POST
    @Path("/generate-ai-content")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response generateAiContent(String requestBody) {
        try {
            // Parse request
            JsonReader reader = Json.createReader(new StringReader(requestBody));
            JsonObject json = reader.readObject();
            String userPrompt = json.getString("prompt", "");
            
            if (userPrompt.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\": \"Prompt is required\"}")
                        .build();
            }
            
            log.info("Generating AI content with prompt: {}", userPrompt);
            
            // Build system prompt with instructions
            String systemPrompt = """
                Du bist ein Assistent für das Verfassen professioneller E-Mails für ein Maturaball-Ticketverkaufssystem.
                
                WICHTIGE ANWEISUNGEN:
                1. Generiere sowohl einen BETREFF als auch den E-MAIL-INHALT
                2. Format: Beginne mit "BETREFF: [dein Betreff]" gefolgt von einer Leerzeile, dann der E-Mail-Inhalt
                
                ABSENDER-IDENTITÄT:
                - Unterzeichne E-Mails IMMER mit "Ihr Ballkomitee" oder "Das Ballkomitee"
                - NIEMALS "Ticketverkaufsteam" oder ähnliche Bezeichnungen verwenden
                - Du repräsentierst das Ballkomitee eines Maturaballs
                
                VERFÜGBARE VARIABLEN (WICHTIG - BITTE VERWENDEN!):
                - {{fullName}} - Vollständiger Name des Kunden (z.B. "Max Mustermann")
                  → Verwende diese Variable in der ANREDE/EINLEITUNG der E-Mail
                  → Beispiel: "Sehr geehrte/r {{fullName}}," oder "Hallo {{fullName}},"
                
                - {{orderId}} - Eindeutige Bestellungs-ID
                  → Verwende diese Variable im BETREFF für bessere Nachverfolgbarkeit
                  → Beispiel: "Ihre Bestellung {{orderId}}" oder "Bestellung {{orderId}} - [Thema]"
                  → Kann auch im E-Mail-Text bei Bezug auf die Bestellung verwendet werden
                
                FORMATIERUNG:
                - Verwende HTML-Tags für Formatierung: <strong>fett</strong>, <em>kursiv</em>
                - Für Überschriften: <h1>Große Überschrift</h1>, <h2>Kleine Überschrift</h2>
                - Für Links: <a href="URL">Link-Text</a>
                - Zeilenumbrüche werden automatisch zu <br> konvertiert
                
                STIL:
                - Professionell aber freundlich
                - Klare, direkte Sprache
                - Höfliche Anrede und Grußformel
                - Auf Deutsch verfassen
                - Kontext: Maturaball-Veranstaltung
                - WICHTIG: Nutze die Variablen für Personalisierung!
                
                Erstelle basierend auf der Anfrage eine passende E-Mail mit Betreff und Inhalt.
                """;
            
            // Combine system and user prompt
            String fullPrompt = systemPrompt + "\n\nANFRAGE: " + userPrompt;
            
            // Get model from AiManager
            String model = aiManager.getModel();
            
            // Call OpenRouter API
            String apiResponse = aiManager.callApi(fullPrompt, model);
            log.debug("AI API response: {}", apiResponse);
            
            // Parse response to extract content
            JsonReader responseReader = Json.createReader(new StringReader(apiResponse));
            JsonObject responseJson = responseReader.readObject();
            
            String generatedText = responseJson
                    .getJsonArray("choices")
                    .getJsonObject(0)
                    .getJsonObject("message")
                    .getString("content");
            
            log.info("AI content generated successfully, length: {}", generatedText.length());
            
            // Parse subject and content from response
            String subject = "";
            String content = "";
            
            // Look for "BETREFF:" pattern
            if (generatedText.contains("BETREFF:")) {
                int subjectStart = generatedText.indexOf("BETREFF:") + 8;
                int subjectEnd = generatedText.indexOf("\n", subjectStart);
                if (subjectEnd > subjectStart) {
                    subject = generatedText.substring(subjectStart, subjectEnd).trim();
                    content = generatedText.substring(subjectEnd).trim();
                } else {
                    subject = generatedText.substring(subjectStart).trim();
                }
            } else {
                // Fallback: use first line as subject
                int firstNewline = generatedText.indexOf("\n");
                if (firstNewline > 0) {
                    subject = generatedText.substring(0, firstNewline).trim();
                    content = generatedText.substring(firstNewline).trim();
                } else {
                    content = generatedText;
                }
            }
            
            // Return response with subject and content
            JsonObject response = Json.createObjectBuilder()
                    .add("subject", subject)
                    .add("content", content)
                    .build();
            
            return Response.ok(response.toString()).build();
            
        } catch (Exception e) {
            log.error("Error generating AI content", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"" + e.getMessage() + "\"}")
                    .build();
        }
    }
}

