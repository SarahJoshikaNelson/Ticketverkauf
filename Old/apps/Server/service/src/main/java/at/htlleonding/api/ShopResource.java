package at.htlleonding.api;

import at.htlleonding.ProductManager;
import at.htlleonding.SettingManager;
import at.htlleonding.TicketManager;
import at.htlleonding.WebSockets.ShopStockWebSocket;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.repositories.OrderCacheRepo;
import at.htlleonding.repositories.SettingRepo;
import at.htlleonding.types.OrderCache;
import at.htlleonding.types.Setting;
import at.htlleonding.types.dtos.*;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.jwt.Claims;

import com.stripe.Stripe;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.exception.StripeException;

import at.htlleonding.enums.TicketType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/v2/shop")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ShopResource {
    @Inject
    ProductManager productManager;

    @Inject
    ShopStockWebSocket shopStockWebSocket;

    @Inject
    SettingRepo settingRepo;

    @Inject
    JsonWebToken jwt;

    @Inject
    SettingManager settingManager;

    @Inject
    TicketManager ticketManager;

    @Inject
    OrderCacheRepo orderCacheRepo;

    @ConfigProperty(name = "config.shop-url")
    String shopUrl;

    @ConfigProperty(name = "config.stripe-secret-key")
    String stripeSecretKey;

    private static final String SHOP_MAIL_ENABLED_KEY = "ShopMailEnabled";

    private String getEffectiveStripeKey() {
        String dbKey = settingManager.getStripeSecretKey();
        return (dbKey != null && !dbKey.isBlank()) ? dbKey : stripeSecretKey;
    }

    @GET
    @Path("/products")
    public Response getProducts() {
        return Response.ok(productManager.getAllProducts()).build();
    }

    @GET
    @Path("/products/{id}")
    public Response getProduct(@PathParam("id") Long id) {
        ProductDTO p = productManager.getProduct(id);
        if (p == null) return Response.status(Response.Status.NOT_FOUND).build();
        return Response.ok(p).build();
    }

    @POST
    @Path("/order/{productId}")
    public Response orderProduct(@PathParam("productId") Long productId, @QueryParam("quantity") @DefaultValue("1") int quantity) {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            productManager.orderProduct(productId, email, quantity);
            shopStockWebSocket.broadcast(productManager.getAllProducts());
            return Response.ok().build();
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO(e.getMessage())).build();
        }
    }

    @POST
    @Path("/bulk-order")
    public Response bulkOrder(at.htlleonding.types.dtos.BulkOrderRequestDTO request) {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            productManager.bulkOrder(request.items(), email);
            shopStockWebSocket.broadcast(productManager.getAllProducts());
            return Response.ok().build();
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO(e.getMessage())).build();
        }
    }

    @GET
    @Path("/my-orders")
    public Response getMyOrders() {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        return Response.ok(productManager.getUserOrders(email)).build();
    }

    @GET
    @Path("/my-completed-orders")
    public Response getMyCompletedOrders() {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        return Response.ok(productManager.getUserCompletedOrders(email)).build();
    }

    @GET
    @Path("/my-upgradeable-counts")
    public Response getMyUpgradeableCounts() {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        return Response.ok(productManager.getUpgradeableCountsByType(email)).build();
    }

    @GET
    @Path("/my-tickets")
    public Response getMyDigitalTickets() {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        return Response.ok(productManager.getUserDigitalTickets(email)).build();
    }

    @POST
    @Path("/upgrade-ticket/{ticketId}")
    public Response upgradeTicket(@PathParam("ticketId") UUID ticketId) {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            productManager.upgradeTicket(ticketId, email);
            return Response.ok().build();
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO(e.getMessage())).build();
        }
    }

    @POST
    @Path("/upgrade-by-type")
    public Response upgradeByType(UpgradeByTypeRequestDTO request) {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        if (request == null || request.ticketType() == null || request.quantity() < 1) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO("ticketType und quantity (mind. 1) erforderlich.")).build();
        }
        TicketType type;
        try {
            type = TicketType.valueOf(request.ticketType().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO("Ungültiger ticketType: " + request.ticketType())).build();
        }
        try {
            productManager.upgradeTicketsByType(email, type, request.quantity());
            return Response.ok().build();
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO(e.getMessage())).build();
        }
    }

    @GET
    @Path("/settings")
    @AdminOnly
    @Transactional
    public Response getShopSettings() {
        var setting = settingRepo.findById(SHOP_MAIL_ENABLED_KEY);
        boolean mailEnabled = setting != null && setting.getValue() == 1.0;
        return Response.ok(Map.of("mailEnabled", mailEnabled)).build();
    }

    @PUT
    @Path("/settings")
    @AdminOnly
    @Transactional
    public Response updateShopSettings(@QueryParam("mailEnabled") boolean mailEnabled) {
        var setting = settingRepo.findById(SHOP_MAIL_ENABLED_KEY);
        if (setting == null) {
            setting = new Setting();
            setting.setKey(SHOP_MAIL_ENABLED_KEY);
        }
        setting.setValue(mailEnabled ? 1.0 : 0.0);
        settingRepo.persist(setting);
        return Response.ok().build();
    }

    @POST
    @Path("/create-checkout-session")
    public Response createCheckoutSession(ShopCheckoutRequestDTO request) {
        String email = jwt.getClaim(Claims.email.name());
        if (email == null) email = jwt.getName();
        if (email == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!settingManager.isStripeEnabled()) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErrorDTO("Stripe-Zahlungen sind derzeit deaktiviert.")).build();
        }

        List<at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO> orderItems = request.items() != null
                ? request.items().stream()
                    .map(i -> new at.htlleonding.types.dtos.BulkOrderRequestDTO.OrderItemDTO(i.productId(), i.quantity()))
                    .collect(Collectors.toList())
                : List.of();

        // Step 1: Reserve product stock (validates + decrements atomically with row locks)
        try {
            productManager.reserveProductStock(orderItems);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        }

        // Step 2: Reserve upgrade tickets (validates + marks physical atomically with row locks)
        List<String> reservedTicketIds = new java.util.ArrayList<>();
        try {
            if (request.upgrades() != null) {
                for (var upgrade : request.upgrades()) {
                    TicketType tt = TicketType.valueOf(upgrade.ticketType().toUpperCase());
                    reservedTicketIds.addAll(productManager.reserveUpgradeTickets(email, tt, upgrade.quantity()));
                }
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            productManager.restoreProductStock(orderItems);
            return Response.status(Response.Status.CONFLICT).entity(new ErrorDTO(e.getMessage())).build();
        }

        // Step 3: Persist order cache with reservation details
        ShopCheckoutRequestDTO cacheDto = new ShopCheckoutRequestDTO(
                email, request.items(), request.upgrades(), reservedTicketIds);
        OrderCache orderCache;
        try {
            orderCache = productManager.persistShopOrderCache(cacheDto);
        } catch (Exception e) {
            productManager.restoreProductStock(orderItems);
            productManager.restoreUpgradeTickets(reservedTicketIds);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new ErrorDTO("Fehler beim Speichern der Bestellung.")).build();
        }

        // Step 4: Create Stripe checkout session
        try {
            Stripe.apiKey = getEffectiveStripeKey();

            CustomerCreateParams customerParams = CustomerCreateParams.builder()
                    .setEmail(email)
                    .build();
            Customer customer = Customer.create(customerParams);

            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(shopUrl + "/checkout/success?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(shopUrl + "/checkout/cancel")
                    .setCustomer(customer.getId())
                    .setExpiresAt(System.currentTimeMillis() / 1000 + 1800);

            if (request.items() != null) {
                for (var item : request.items()) {
                    ProductDTO product = productManager.getProduct(item.productId());
                    if (product == null) {
                        productManager.restoreProductStock(orderItems);
                        productManager.restoreUpgradeTickets(reservedTicketIds);
                        return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new ErrorDTO("Produkt mit ID " + item.productId() + " nicht gefunden.")).build();
                    }
                    builder.addLineItem(buildLineItem(product.title(), product.price(), item.quantity()));
                }
            }

            if (request.upgrades() != null) {
                double upgradePrice = ticketManager.getAdditionalChargeForPhysicalTicket();
                for (var upgrade : request.upgrades()) {
                    String label = "Ticket-Upgrade: " + upgrade.ticketType();
                    builder.addLineItem(buildLineItem(label, upgradePrice, upgrade.quantity()));
                }
            }

            SessionCreateParams params = builder
                    .putMetadata("order_cache_id", orderCache.getId().toString())
                    .putMetadata("source", "shop")
                    .build();

            Session session = Session.create(params);
            shopStockWebSocket.broadcast(productManager.getAllProducts());
            return Response.ok(Map.of("location", session.getUrl())).build();
        } catch (StripeException e) {
            productManager.restoreProductStock(orderItems);
            productManager.restoreUpgradeTickets(reservedTicketIds);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new ErrorDTO("Stripe-Fehler: " + e.getMessage())).build();
        }
    }

    @POST
    @Path("/webhook")
    @PermitAll
    @Consumes(MediaType.APPLICATION_JSON)
    public Response shopWebhook(StripeWebhookDTO webhook) {
        Stripe.apiKey = getEffectiveStripeKey();

        if (webhook.data == null || webhook.data.object == null) {
            return Response.status(400).entity("Missing checkout session data").build();
        }

        StripeEventDTO checkoutSession = webhook.data.object;

        if (checkoutSession.metadata == null || checkoutSession.metadata.get("order_cache_id") == null) {
            return Response.status(400).entity("Missing order_cache_id in metadata").build();
        }

        String source = checkoutSession.metadata.getOrDefault("source", "");
        if (!"shop".equals(source)) {
            return Response.ok().entity("Ignoring non-shop webhook").build();
        }

        try {
            OrderCache orderCache = orderCacheRepo
                    .findById(UUID.fromString(checkoutSession.metadata.get("order_cache_id")));
            if (orderCache == null) {
                return Response.status(400).entity("Order cache not found").build();
            }

            ShopCheckoutRequestDTO cart = ShopCheckoutRequestDTO.fromJson(orderCache.getReservation());
            if (cart == null) {
                return Response.status(400).entity("Failed to parse shop cart from cache").build();
            }

            if ("checkout.session.expired".equals(webhook.type)) {
                productManager.undoShopReservation(cart);
                shopStockWebSocket.broadcast(productManager.getAllProducts());
                return Response.ok().entity("Shop reservation restored after session expiry").build();
            }

            if (!"checkout.session.completed".equals(webhook.type)
                    && !"checkout.session.async_payment_succeeded".equals(webhook.type)) {
                return Response.ok().entity("Ignoring Stripe event: " + webhook.type).build();
            }

            if ("paid".equals(checkoutSession.payment_status)) {
                productManager.fulfillPaidShopOrder(cart);
                shopStockWebSocket.broadcast(productManager.getAllProducts());
                return Response.ok().build();
            }

            return Response.status(400).entity("Session is not paid").build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity("Invalid order cache id: " + e.getMessage()).build();
        }
    }

    @GET
    @Path("/checkout/session/{sessionId}")
    @PermitAll
    public Response getShopSessionDetails(@PathParam("sessionId") String sessionId) {
        Stripe.apiKey = getEffectiveStripeKey();

        try {
            Session session = Session.retrieve(sessionId);

            Map<String, String> metadata = session.getMetadata();
            if (metadata == null || metadata.get("order_cache_id") == null) {
                return Response.status(404).entity("No order data found for this session").build();
            }

            OrderCache orderCache = orderCacheRepo.findById(UUID.fromString(metadata.get("order_cache_id")));
            if (orderCache == null) {
                return Response.status(404).entity("Order not found").build();
            }

            ShopCheckoutRequestDTO cart = ShopCheckoutRequestDTO.fromJson(orderCache.getReservation());
            if (cart == null) {
                return Response.status(500).entity("Failed to parse order data").build();
            }

            Map<String, Object> result = new HashMap<>();
            result.put("email", cart.email());
            result.put("items", cart.items());
            result.put("upgrades", cart.upgrades());
            result.put("paymentStatus", session.getPaymentStatus());
            result.put("amountTotal", session.getAmountTotal());
            result.put("currency", session.getCurrency());

            return Response.ok(result).build();
        } catch (StripeException e) {
            return Response.status(400).entity("Invalid session ID").build();
        }
    }

    private SessionCreateParams.LineItem buildLineItem(String name, double priceInEuros, long quantity) {
        return SessionCreateParams.LineItem.builder()
                .setQuantity(quantity)
                .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("eur")
                                .setUnitAmount(Math.round(priceInEuros * 100))
                                .setProductData(
                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                .setName(name)
                                                .build())
                                .build())
                .build();
    }

    // Admin endpoints
    @POST
    @Path("/admin/products")
    @AdminOnly
    public Response createOrUpdateProduct(ProductDTO dto) {
        productManager.createOrUpdateProduct(dto);
        shopStockWebSocket.broadcast(productManager.getAllProducts());
        return Response.ok().build();
    }

    @DELETE
    @Path("/admin/products/{id}")
    @AdminOnly
    public Response deleteProduct(@PathParam("id") Long id) {
        productManager.deleteProduct(id);
        shopStockWebSocket.broadcast(productManager.getAllProducts());
        return Response.ok().build();
    }

    @GET
    @Path("/admin/orders")
    @AdminOnly
    public Response getAllOrders() {
        return Response.ok(productManager.getAllOrders()).build();
    }
}
