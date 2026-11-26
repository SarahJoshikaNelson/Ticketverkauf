package at.htlleonding.api;

import at.htlleonding.AiManager;
import at.htlleonding.BankProcessManager;
import at.htlleonding.OrderManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.repositories.OrderRepo;
import at.htlleonding.types.Order;
import at.htlleonding.types.dtos.BankMatchRequest;
import at.htlleonding.types.dtos.BankProcessDTO;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObjectBuilder;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.jboss.resteasy.plugins.providers.multipart.InputPart;
import org.jboss.resteasy.plugins.providers.multipart.MultipartFormDataInput;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Path("/api/v2/bank")
@RequiredArgsConstructor
public class BankProcessResource {
    private final BankProcessManager bankProcessManager;
    private final AiManager aiManager;
    private final OrderManager orderManager;
    private final OrderRepo orderRepo;

    /**
     * Check if an AI token is configured.
     * Does not return the actual token for security reasons.
     *
     * @return JSON with hasToken boolean
     */
    @GET
    @Path("/ai-token/status")
    @Produces(MediaType.APPLICATION_JSON)
    @AdminOnly
    public Response getAiTokenStatus() {
        boolean hasToken = aiManager.getToken() != null;
        return Response.ok(String.format("{\"hasToken\": %s}", hasToken)).build();
    }

    /**
     * Set the AI token for OpenRouter API calls.
     * Token cannot be retrieved afterwards, only overwritten.
     *
     * @param token the API token
     * @return success response
     */
    @PUT
    @Path("/ai-token")
    @Consumes(MediaType.TEXT_PLAIN)
    @Transactional
    @AdminOnly
    public Response setAiToken(String token) {
        if (token == null || token.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Token darf nicht leer sein.\"}")
                    .build();
        }
        aiManager.storeToken(token.trim());
        return Response.ok("{\"message\": \"AI Token erfolgreich gespeichert.\"}").build();
    }

    /**
     * Get the current AI model.
     *
     * @return JSON with model string
     */
    @GET
    @Path("/ai-model")
    @Produces(MediaType.APPLICATION_JSON)
    @AdminOnly
    public Response getAiModel() {
        String model = aiManager.getModel();
        return Response.ok(String.format("{\"model\": \"%s\"}", model)).build();
    }

    /**
     * Set the AI model for OpenRouter API calls.
     *
     * @param model the model identifier (e.g. "openai/gpt-4o-mini")
     * @return success response
     */
    @PUT
    @Path("/ai-model")
    @Consumes(MediaType.TEXT_PLAIN)
    @Transactional
    @AdminOnly
    public Response setAiModel(String model) {
        if (model == null || model.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Modell darf nicht leer sein.\"}")
                    .build();
        }
        aiManager.storeModel(model.trim());
        return Response.ok("{\"message\": \"AI Modell erfolgreich gespeichert.\"}").build();
    }

    /**
     * Match bank transactions to orders by lastName + amount and mark as paid.
     * Returns details about which transactions could be matched and which failed.
     *
     * @param request list of transactions with lastName and amount
     * @return JSON with matched orders, marked as paid, and failed matches
     */
    @POST
    @Path("/match-and-pay")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @AdminOnly
    public Response matchAndMarkAsPaid(BankMatchRequest request) {
        if (request == null || request.transactions() == null || request.transactions().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Keine Transaktionen angegeben.\"}")
                    .build();
        }

        List<MatchResult> results = new ArrayList<>();

        for (BankMatchRequest.TransactionMatch tx : request.transactions()) {
            MatchResult result = new MatchResult(tx.lastName(), tx.amount(), tx.description());
            
            // Find orders by last name
            List<Order> orders = orderRepo.findByCustomerLastName(tx.lastName());
            
            // Find order with matching amount (with small tolerance for floating point)
            Order matchedOrder = null;
            for (Order order : orders) {
                double orderAmount = order.getRevenue();
                if (Math.abs(orderAmount - tx.amount()) < 0.01) {
                    matchedOrder = order;
                    break;
                }
            }

            if (matchedOrder != null) {
                try {
                    orderManager.toggleOrderStatus(matchedOrder.getId(), OrderStatus.PAID);
                    result.success = true;
                    result.orderId = matchedOrder.getId().toString();
                    result.customerName = matchedOrder.getCustomer().getFirstName() + " " + 
                                         matchedOrder.getCustomer().getLastName();
                } catch (Exception e) {
                    result.success = false;
                    result.error = "Fehler beim Aktualisieren: " + e.getMessage();
                }
            } else {
                result.success = false;
                if (orders.isEmpty()) {
                    result.error = "Kein Kunde mit Nachname '" + tx.lastName() + "' gefunden.";
                } else {
                    result.error = "Kein Auftrag mit Betrag " + String.format("%.2f", tx.amount()) + 
                                  " € für '" + tx.lastName() + "' gefunden.";
                }
            }
            
            results.add(result);
        }

        // Build JSON response
        JsonArrayBuilder successArray = Json.createArrayBuilder();
        JsonArrayBuilder failedArray = Json.createArrayBuilder();

        for (MatchResult r : results) {
            JsonObjectBuilder obj = Json.createObjectBuilder()
                    .add("lastName", r.lastName)
                    .add("amount", r.amount)
                    .add("description", r.description != null ? r.description : "");
            
            if (r.success) {
                obj.add("orderId", r.orderId)
                   .add("customerName", r.customerName);
                successArray.add(obj);
            } else {
                obj.add("error", r.error);
                failedArray.add(obj);
            }
        }

        long successCount = results.stream().filter(r -> r.success).count();
        long failedCount = results.size() - successCount;

        String response = Json.createObjectBuilder()
                .add("success", successCount)
                .add("failed", failedCount)
                .add("matched", successArray)
                .add("notFound", failedArray)
                .build()
                .toString();

        return Response.ok(response).build();
    }

    private static class MatchResult {
        String lastName;
        double amount;
        String description;
        boolean success;
        String orderId;
        String customerName;
        String error;

        MatchResult(String lastName, double amount, String description) {
            this.lastName = lastName;
            this.amount = amount;
            this.description = description;
        }
    }

    /**
     * Upload a bank statement PDF and extract structured transaction data.
     *
     * @param input multipart form data containing the PDF file
     * @return JSON with extracted bank statement information
     */
    @POST
    @Path("/process")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response processBankStatement(MultipartFormDataInput input) {
        Map<String, List<InputPart>> uploadForm = input.getFormDataMap();
        List<InputPart> inputParts = uploadForm.get("file");

        if (inputParts == null || inputParts.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"No file uploaded. Use form field 'file'.\"}")
                    .build();
        }

        InputPart inputPart = inputParts.getFirst();
        java.nio.file.Path tempFile = null;

        try {
            String fileName = extractFileName(inputPart);
            
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\": \"Only PDF files are supported.\"}")
                        .build();
            }

            // Save to temp file
            tempFile = Files.createTempFile("bank-statement-", ".pdf");
            try (InputStream is = inputPart.getBody(InputStream.class, null)) {
                Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }

            BankProcessDTO dto = new BankProcessDTO(fileName, tempFile);
            String result = bankProcessManager.processBankStatement(dto);

            return Response.ok(result).build();

        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"Failed to process file: " + e.getMessage() + "\"}")
                    .build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"" + e.getMessage() + "\"}")
                    .build();
        } finally {
            // Clean up temp file
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {
                }
            }
        }
    }

    /**
     * Extract the original filename from the Content-Disposition header.
     */
    private String extractFileName(InputPart inputPart) {
        String header = inputPart.getHeaders().getFirst("Content-Disposition");
        if (header != null) {
            for (String part : header.split(";")) {
                if (part.trim().startsWith("filename")) {
                    String[] nameParts = part.split("=");
                    if (nameParts.length > 1) {
                        return nameParts[1].trim().replace("\"", "");
                    }
                }
            }
        }
        return "uploaded.pdf";
    }
}

