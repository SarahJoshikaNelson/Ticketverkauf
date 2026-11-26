package at.htlleonding.api;

import at.htlleonding.AdminManager;
import at.htlleonding.LayerManager;
import at.htlleonding.SettingManager;
import at.htlleonding.enums.OrderGroupBy;
import at.htlleonding.enums.OrderSortField;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.SortDirection;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.Layer;
import at.htlleonding.types.Room;
import at.htlleonding.types.Table;
import at.htlleonding.types.dtos.AdminDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v2/admin")
@RequiredArgsConstructor
public class AdminResource {

    private final AdminManager adminManager;
    private final LayerManager layerManager;
    private final SettingManager settingManager;

    private static final Logger log = LoggerFactory.getLogger(AdminResource.class);

    @GET
    @Path("/getOrderOverview")
    @AdminOnly
    public Response getOrderOverview(
            @QueryParam("term") String termBase64,
            @QueryParam("status") OrderStatus status,
            @QueryParam("offset") int offset,
            @QueryParam("limit") int limit,
            @QueryParam("sortBy") @DefaultValue("DATE") OrderSortField sortBy,
            @QueryParam("sortDirection") @DefaultValue("DESC") SortDirection sortDirection,
            @QueryParam("groupBy") @DefaultValue("NONE") OrderGroupBy groupBy,
            @QueryParam("groupSortDirection") SortDirection groupSortDirection,
            @QueryParam("priceChunkSize") @DefaultValue("50") int priceChunkSize
    ) {
        log.info("Term: {}", termBase64);
        log.info("Status: {}", status);
        log.info("Offset: {}", offset);
        log.info("Limit: {}", limit);
        log.info("SortBy: {}", sortBy);
        log.info("SortDirection: {}", sortDirection);
        log.info("GroupBy: {}", groupBy);

        // Group sort field is always fixed based on groupBy type
        OrderSortField groupSortBy = switch (groupBy) {
            case DAY, MONTH, YEAR ->
                OrderSortField.DATE;
            case PERSON ->
                OrderSortField.USER_NAME;
            case PRICE ->
                OrderSortField.PRICING;
            case STATUS, NONE ->
                OrderSortField.DATE;
        };
        // Default direction based on groupBy if not explicitly provided
        if (groupSortDirection == null) {
            groupSortDirection = switch (groupBy) {
                case DAY, MONTH, YEAR ->
                    SortDirection.DESC;
                case PERSON ->
                    SortDirection.ASC;
                case PRICE ->
                    SortDirection.ASC;
                case STATUS ->
                    SortDirection.ASC;
                case NONE ->
                    SortDirection.DESC;
            };
        }

        if (groupBy != OrderGroupBy.NONE) {
            String term = termBase64 != null ? new String(Base64.getDecoder().decode(termBase64)) : null;
            return Response.ok(adminManager.getGroupedOrderOverview(
                    term, status, limit, offset,
                    sortBy, sortDirection,
                    groupSortBy, groupSortDirection,
                    groupBy, priceChunkSize
            )).build();
        }

        if (status != null && termBase64 != null) {
            var term = new String(Base64.getDecoder().decode(termBase64));
            return Response.ok(adminManager.getOrderOverview(term, status, limit, offset, sortBy, sortDirection)).build();
        }

        if (termBase64 != null) {
            var term = new String(Base64.getDecoder().decode(termBase64));
            return Response.ok(adminManager.getOrderOverview(term, offset, limit, sortBy, sortDirection)).build();
        }

        if (status != null) {
            return Response.ok(adminManager.getOrderOverview(status, offset, limit, sortBy, sortDirection)).build();
        }

        return Response.ok(adminManager.getOrderOverview(offset, limit, sortBy, sortDirection)).build();
    }

    @GET
    @Path("/access")
    @Produces(MediaType.TEXT_PLAIN)
    @AdminOnly
    public Response access() {
        return Response.ok("Access granted").build();
    }

    @GET
    @Path("/getOrderDetails/{orderID}")
    @AdminOnly
    public Response getOrderDetails(@PathParam("orderID") UUID orderID) {
        return Response.ok(adminManager.getOrderDetails(orderID)).build();
    }

    @GET
    @Path("/getOrderBySeat/{seatId}")
    @AdminOnly
    public Response getOrderBySeatId(@PathParam("seatId") String seatId) {
        var order = adminManager.getOrderBySeatId(seatId);
        if (order == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("No order found for seat").build();
        }
        return Response.ok(order).build();
    }

    @POST
    @Transactional
    @AdminOnly
    public Response addAdmin(AdminDTO admin) {
        if (adminManager.addAdmin(admin)) {
            return Response.ok("Admin added").build();
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DELETE
    @Transactional
    @Path("{id}")
    @AdminOnly
    public Response deleteAdmin(@PathParam("id") String id) {
        if (adminManager.deleteAdmin(id)) {
            return Response.ok("Admin deleted").build();
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GET
    @Transactional
    @AdminOnly
    public Response getAdmins() {
        return Response.ok(adminManager.getAdmins()).build();
    }

    @GET
    @Transactional
    @Path("/layer/")
    @AdminOnly
    public Response getLayers() {
        return Response.ok(layerManager.getLayers()).build();
    }

    @PUT
    @Transactional
    @Path("/layers/")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateAllLayers(String rawJson) {
        log.info("=== RAW JSON RECEIVED ===");
        log.info(rawJson);
        log.info("=== END RAW JSON ===");

        // Now try to deserialize manually
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Layer> layers = mapper.readValue(rawJson, new TypeReference<>() {
            });

            log.info("Manually deserialized {} layers", layers.size());
            for (Layer layer : layers) {
                log.info("Layer: {} Level: {} Picture: {} Rooms: {}", layer.getName(), layer.getLevel(), layer.getPicture() != null ? "set" : "not set", layer.getRooms() != null ? layer.getRooms().size() : "null");
                if (layer.getRooms() == null) {
                    continue;
                }

                for (Room room : layer.getRooms()) {
                    log.info("Room: {} Pos({},{}) Size({},{}) Tables: {}", room.getName(), room.getXPosition(), room.getYPosition(), room.getXLength(), room.getYLength(), room.getTables() != null ? room.getTables().size() : "null");
                    if (room.getTables() == null) {
                        continue;
                    }

                    for (Table table : room.getTables()) {
                        log.info("Table: {} Pos({},{}) Size({},{}) Seats: {}", table.getName(), table.getXPosition(), table.getYPosition(), table.getXLength(), table.getYLength(), table.getSeats() != null ? table.getSeats().size() : "null");
                    }
                }
            }

            log.info("Processing layers update...");
            boolean success = layerManager.updateAllLayers(layers);

            return success
                    ? Response.ok("Layers updated successfully").build()
                    : Response.status(500).entity("Failed to update layers").build();
        } catch (Exception e) {
            for (var ste : e.getStackTrace()) {
                log.error("{}", ste);
            }
            return Response.status(500).entity("Error updating layers: " + e.getMessage()).build();
        }
    }

    @POST
    @Transactional
    @Path("/phase")
    @AdminOnly
    public Response setPhase(int phase) {
        settingManager.setPhase(phase);
        return Response.ok().build();
    }

    @GET
    @Transactional
    @Path("/phase")
    @AdminOnly
    public Response getPhase() {
        return Response.ok(settingManager.getPhase()).build();
    }

    @GET
    @Transactional
    @Path("/stripe-enabled")
    @AdminOnly
    public Response isStripeEnabled() {
        return Response.ok(Map.of("enabled", settingManager.isStripeEnabled())).build();
    }

    @POST
    @Transactional
    @Path("/stripe-enabled")
    @AdminOnly
    public Response setStripeEnabled(Map<String, Boolean> body) {
        if (settingManager.getPhase() != 0) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Stripe kann nur in Phase 0 konfiguriert werden.").build();
        }
        settingManager.setStripeEnabled(body.getOrDefault("enabled", false));
        return Response.ok().build();
    }

    @GET
    @Transactional
    @Path("/stripe-keys")
    @AdminOnly
    public Response getStripeKeys() {
        String secretKey = settingManager.getStripeSecretKey();
        String webhookSecret = settingManager.getStripeWebhookSecret();
        return Response.ok(Map.of(
                "secretKey", secretKey != null ? secretKey : "",
                "webhookSecret", webhookSecret != null ? webhookSecret : ""
        )).build();
    }

    @POST
    @Transactional
    @Path("/stripe-keys")
    @AdminOnly
    public Response setStripeKeys(Map<String, String> body) {
        if (settingManager.getPhase() != 0) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Stripe-Schlüssel können nur in Phase 0 konfiguriert werden.").build();
        }
        String secretKey = body.get("secretKey");
        String webhookSecret = body.get("webhookSecret");
        if (secretKey != null && !secretKey.isBlank()) {
            settingManager.setStripeSecretKey(secretKey);
        }
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            settingManager.setStripeWebhookSecret(webhookSecret);
        }
        return Response.ok().build();
    }
}