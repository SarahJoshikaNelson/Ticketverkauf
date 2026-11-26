package at.htlleonding.api;

import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URISyntaxException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.stripe.Stripe;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;

import at.htlleonding.enums.TicketType;
import at.htlleonding.interceptors.PhaseApproved;
import at.htlleonding.BookingManager;
import at.htlleonding.ProductManager;
import at.htlleonding.TicketManager;
import at.htlleonding.repositories.OrderCacheRepo;
import at.htlleonding.types.OrderCache;
import at.htlleonding.types.dtos.ReservationBookingReqDTO;
import at.htlleonding.types.dtos.ShopCheckoutRequestDTO;
import at.htlleonding.types.dtos.StripeEventDTO;
import at.htlleonding.types.dtos.StripeWebhookDTO;
import at.htlleonding.exceptions.MissingDataException;

import com.stripe.exception.StripeException;

import io.quarkus.narayana.jta.QuarkusTransaction;

@Path("/api/v2/checkout")
@ApplicationScoped
public class CheckoutResource {
    @ConfigProperty(name = "config.order-url")
    String orderUrl;

    @ConfigProperty(name = "config.web-url")
    String webUrl;

    @ConfigProperty(name = "config.stripe-secret-key")
    String stripeSecretKey;

    @ConfigProperty(name = "config.stripe-webhook-secret")
    String stripeWebhookSecret;

    @Inject
    OrderCacheRepo orderCacheRepo;

    @Inject
    BookingManager bookingManager;

    @Inject
    TicketManager ticketManager;

    @Inject
    at.htlleonding.SettingManager settingManager;

    @Inject
    ProductManager productManager;

    private String getEffectiveStripeKey() {
        String dbKey = settingManager.getStripeSecretKey();
        return (dbKey != null && !dbKey.isBlank()) ? dbKey : stripeSecretKey;
    }

    private String getEffectiveWebhookSecret() {
        String dbSecret = settingManager.getStripeWebhookSecret();
        return (dbSecret != null && !dbSecret.isBlank()) ? dbSecret : stripeWebhookSecret;
    }

    @GET
    @Path("/stripe-enabled")
    @PermitAll
    @Produces(MediaType.APPLICATION_JSON)
    public Response isStripeEnabled() {
        return Response.ok(Map.of("enabled", settingManager.isStripeEnabled())).build();
    }

    @POST
    @PhaseApproved
    @Path("/create-checkout-session")
    @PermitAll
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response checkout(@Context SecurityContext context, ReservationBookingReqDTO reservation)
            throws URISyntaxException {
        if (!settingManager.isStripeEnabled()) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Stripe payments are currently disabled.").build();
        }

        String name = context.getUserPrincipal() != null
                ? context.getUserPrincipal().getName()
                : reservation.customer().firstName() + " " + reservation.customer().lastName();

        at.htlleonding.types.Order reservedOrder;
        try {
            reservedOrder = bookingManager.reserveForStripe(
                    reservation, name, ticketManager.getAdditionalChargeForPhysicalTicket());
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", e.getMessage())).build();
        } catch (MissingDataException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", e.getMessage())).build();
        }

        UUID cacheId;
        try {
            cacheId = QuarkusTransaction.requiringNew().call(() -> {
                OrderCache oc = new OrderCache(reservation.toJson());
                orderCacheRepo.persist(oc);
                orderCacheRepo.flush();
                return oc.getId();
            });
        } catch (Exception e) {
            bookingManager.cancelReservedOrder(reservedOrder.getId());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("message", "Fehler beim Speichern der Bestellung.")).build();
        }

        try {
            Stripe.apiKey = getEffectiveStripeKey();

            CustomerCreateParams paramsC = CustomerCreateParams.builder()
                    .setName(name)
                    .setEmail(reservation.customer().mailAddress())
                    .build();
            Customer customer = Customer.create(paramsC);

            double studentPrice = ticketManager.getStudentTicketPrice();
            double externalPrice = ticketManager.getExternTicketPrice();
            double physicalSurcharge = ticketManager.getAdditionalChargeForPhysicalTicket();

            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(orderUrl + "/checkout/success?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(orderUrl + "/checkout/cancel?session_id={CHECKOUT_SESSION_ID}")
                    .setCustomer(customer.getId())
                    .setExpiresAt(System.currentTimeMillis() / 1000 + 1800);

            long studentDigitalCount = reservation.tickets().stream()
                    .filter(ticket -> ticket.type() == TicketType.STUDENT && !ticket.isPhysical()).count();
            if (studentDigitalCount > 0) {
                builder.addLineItem(buildLineItem("Schülerkarte (Digital)", studentPrice, studentDigitalCount));
            }

            long studentPhysicalCount = reservation.tickets().stream()
                    .filter(ticket -> ticket.type() == TicketType.STUDENT && ticket.isPhysical()).count();
            if (studentPhysicalCount > 0) {
                builder.addLineItem(buildLineItem("Schülerkarte (Physisch)", studentPrice + physicalSurcharge, studentPhysicalCount));
            }

            long externalDigitalCount = reservation.tickets().stream()
                    .filter(ticket -> ticket.type() == TicketType.EXTERNAL && !ticket.isPhysical()).count();
            if (externalDigitalCount > 0) {
                builder.addLineItem(buildLineItem("Externe Karte (Digital)", externalPrice, externalDigitalCount));
            }

            long externalPhysicalCount = reservation.tickets().stream()
                    .filter(ticket -> ticket.type() == TicketType.EXTERNAL && ticket.isPhysical()).count();
            if (externalPhysicalCount > 0) {
                builder.addLineItem(buildLineItem("Externe Karte (Physisch)", externalPrice + physicalSurcharge, externalPhysicalCount));
            }

            if (reservation.seats() != null && !reservation.seats().isEmpty()) {
                Map<Double, Long> seatsByPrice = reservation.seats().stream()
                        .collect(Collectors.groupingBy(seat -> seat.getPrice(), Collectors.counting()));
                List<Map.Entry<Double, Long>> sortedSeatGroups = seatsByPrice.entrySet().stream()
                        .sorted(Comparator.comparing(Map.Entry::getKey))
                        .toList();
                for (Map.Entry<Double, Long> entry : sortedSeatGroups) {
                    builder.addLineItem(buildLineItem("Sitzplatz", entry.getKey(), entry.getValue()));
                }
            }

            SessionCreateParams params = builder
                    .putMetadata("order_cache_id", cacheId.toString())
                    .putMetadata("reserved_order_id", reservedOrder.getId().toString())
                    .build();

            Session session = Session.create(params);
            return Response.ok(Map.of("location", session.getUrl())).build();
        } catch (StripeException e) {
            bookingManager.cancelReservedOrder(reservedOrder.getId());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("message", "Zahlungsfehler: " + e.getMessage())).build();
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

    @POST
    @Path("/webhook")
    @PermitAll
    @Consumes(MediaType.APPLICATION_JSON)
    public Response fullfillCheckout(StripeWebhookDTO webhook) {
        Stripe.apiKey = getEffectiveStripeKey();

        System.out.println("Webhook: " + webhook.toJson());
        System.out.println("Fullfilling checkout for event: " + webhook.id);

        if (webhook.data == null || webhook.data.object == null) {
            return Response.status(400).entity("Missing checkout session data").build();
        }

        StripeEventDTO checkoutSession = webhook.data.object;

        System.out.println("Checkout session: " + checkoutSession.toJson());

        if (checkoutSession.metadata == null || checkoutSession.metadata.get("order_cache_id") == null) {
            return Response.status(400).entity("Missing order_cache_id in checkout session metadata").build();
        }

        String source = checkoutSession.metadata.getOrDefault("source", "");

        // Handle session expiry
        if ("checkout.session.expired".equals(webhook.type)) {
            if ("shop".equals(source)) {
                try {
                    OrderCache orderCache = orderCacheRepo
                            .findById(UUID.fromString(checkoutSession.metadata.get("order_cache_id")));
                    if (orderCache == null) {
                        return Response.status(400).entity("Order cache not found").build();
                    }
                    ShopCheckoutRequestDTO cart = ShopCheckoutRequestDTO.fromJson(orderCache.getReservation());
                    if (cart != null) {
                        System.out.println("Restoring shop reservation after session expiry for: " + cart.email());
                        productManager.undoShopReservation(cart);
                    }
                    return Response.ok().entity("Shop reservation restored after session expiry").build();
                } catch (IllegalArgumentException e) {
                    return Response.status(400).entity("Invalid order cache id: " + e.getMessage()).build();
                }
            }

            // General order session expiry — cancel the reserved order and release seats
            String reservedOrderId = checkoutSession.metadata.get("reserved_order_id");
            if (reservedOrderId != null) {
                try {
                    System.out.println("Cancelling reserved order after session expiry: " + reservedOrderId);
                    bookingManager.cancelReservedOrder(UUID.fromString(reservedOrderId));
                } catch (Exception e) {
                    System.out.println("Failed to cancel reserved order: " + e.getMessage());
                }
            }
            return Response.ok().entity("Reservation cancelled after session expiry").build();
        }

        if (!"checkout.session.completed".equals(webhook.type)
                && !"checkout.session.async_payment_succeeded".equals(webhook.type)) {
            return Response.ok().entity("Ignoring Stripe event: " + webhook.type).build();
        }

        try {
            OrderCache orderCache = orderCacheRepo
                    .findById(UUID.fromString(checkoutSession.metadata.get("order_cache_id")));

            if (orderCache == null) {
                return Response.status(400).entity("Order cache not found").build();
            }

            if (!"paid".equals(checkoutSession.payment_status)) {
                return Response.status(400).entity("Session is not paid").build();
            }

            if ("shop".equals(source)) {
                ShopCheckoutRequestDTO cart = ShopCheckoutRequestDTO.fromJson(orderCache.getReservation());
                if (cart == null) {
                    return Response.status(400).entity("Failed to parse shop cart from cache").build();
                }
                System.out.println("Fulfilling paid shop order for: " + cart.email());
                productManager.fulfillPaidShopOrder(cart);
                return Response.ok().build();
            }

            // General order fulfillment — use pre-reserved order if available
            String reservedOrderId = checkoutSession.metadata.get("reserved_order_id");
            if (reservedOrderId != null) {
                System.out.println("Fulfilling reserved order: " + reservedOrderId);
                bookingManager.fulfillReservedOrder(UUID.fromString(reservedOrderId));
                return Response.ok().build();
            }

            // Backward compatibility for sessions created before the reserve-on-checkout change
            ReservationBookingReqDTO reservation = ReservationBookingReqDTO.fromJson(orderCache.getReservation());
            if (reservation == null) {
                return Response.status(400).entity("Failed to parse reservation from cache").build();
            }

            System.out.println("Booking via Stripe already paid (legacy)");
            bookingManager.bookViaStripeAlreadyPaid(
                reservation,
                reservation.customer().firstName() + " " + reservation.customer().lastName(),
                ticketManager.getAdditionalChargeForPhysicalTicket());
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            System.out.println("Invalid order cache id: " + e.getMessage());
            return Response.status(400).entity("Invalid order cache id").build();
        }
    }

    @GET
    @Path("/session/{sessionId}")
    @PermitAll
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSessionDetails(@PathParam("sessionId") String sessionId) {
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

            ReservationBookingReqDTO reservation = ReservationBookingReqDTO.fromJson(orderCache.getReservation());
            if (reservation == null) {
                return Response.status(500).entity("Failed to parse order data").build();
            }

            Map<String, Object> result = new HashMap<>();
            result.put("customer", reservation.customer());
            result.put("tickets", reservation.tickets());
            result.put("seats", reservation.seats());
            result.put("paymentStatus", session.getPaymentStatus());
            result.put("amountTotal", session.getAmountTotal());
            result.put("currency", session.getCurrency());

            return Response.ok(result).build();
        } catch (StripeException e) {
            return Response.status(400).entity("Invalid session ID").build();
        }
    }
}
