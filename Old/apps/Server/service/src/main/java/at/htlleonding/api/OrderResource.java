package at.htlleonding.api;

import at.htlleonding.OrderManager;
import at.htlleonding.UserManager;
import at.htlleonding.enums.OrderStatus;
import at.htlleonding.exceptions.OrderAlreadyConfirmedException;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.*;
import io.smallrye.jwt.auth.principal.JWTCallerPrincipal;
import jakarta.annotation.security.PermitAll;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/v2/order")
@RequiredArgsConstructor
public class OrderResource {
    private final OrderManager orderManager;
    private final UserManager userManager;

    @PUT
    @AdminOnly
    @Path("/status/{id}")
    public Response setOrderStatus(@PathParam("id") UUID id, OrderStatus status) {
        try {
            orderManager.toggleOrderStatus(id, status);
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(404).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/confirm/{id}")
    public Response userConfirmOrder(@PathParam("id") UUID id) {
        try {
            try {
                orderManager.confirmOrder(id);
                return Response.ok().build();
            } catch (OrderAlreadyConfirmedException e) {
                return Response.status(409).entity("Order already confirmed").build();
            }
        } catch (IllegalArgumentException e) {
            return Response.status(404).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/download/{id}")
    @PermitAll
    public Response downloadOrder(@Context SecurityContext context, @PathParam("id") UUID id,
            @QueryParam("token") String token) {
        // Determine the user's email from authentication
        String userEmail;
        if (context.getUserPrincipal() != null) {
            // Authenticated via JWT (student)
            if (!(context.getUserPrincipal() instanceof JWTCallerPrincipal jwtPrincipal)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid authentication.").build();
            }
            userEmail = jwtPrincipal.getClaim("email");
        } else if (token != null) {
            // Non-student with token - need to find the email associated with this order
            var order = orderManager.getOrderById(id);
            if (order == null) {
                return Response.status(Response.Status.NOT_FOUND).entity("Order not found.").build();
            }
            String orderEmail = order.getCustomer().getMailAddress();
            if (!userManager.checkToken(orderEmail, token)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid access token.").build();
            }
            userEmail = orderEmail;
        } else {
            return Response.status(Response.Status.UNAUTHORIZED).entity("Authentication required.").build();
        }

        // Verify the order belongs to the user
        if (!orderManager.isOrderOwnedByEmail(id, userEmail)) {
            return Response.status(Response.Status.FORBIDDEN).entity("You do not have access to this order.").build();
        }

        try {
            byte[] pdf = orderManager.getFullOrderDownload(orderManager.getTicketDownloads(id));
            return Response.ok(pdf)
                    .header("Content-Disposition", "attachment; filename=\"tickets-" + id + ".pdf\"")
                    .header("Content-Type", "application/pdf")
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/bill/{id}")
    @PermitAll
    public Response downloadBill(@Context SecurityContext context, @PathParam("id") UUID id,
            @QueryParam("token") String token) {
        // Determine the user's email from authentication
        String userEmail;
        if (context.getUserPrincipal() != null) {
            // Authenticated via JWT (student)
            if (!(context.getUserPrincipal() instanceof JWTCallerPrincipal jwtPrincipal)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid authentication.").build();
            }
            userEmail = jwtPrincipal.getClaim("email");
        } else if (token != null) {
            // Non-student with token - need to find the email associated with this order
            var order = orderManager.getOrderById(id);
            if (order == null) {
                return Response.status(Response.Status.NOT_FOUND).entity("Order not found.").build();
            }
            String orderEmail = order.getCustomer().getMailAddress();
            if (!userManager.checkToken(orderEmail, token)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid access token.").build();
            }
            userEmail = orderEmail;
        } else {
            return Response.status(Response.Status.UNAUTHORIZED).entity("Authentication required.").build();
        }

        // Verify the order belongs to the user
        if (!orderManager.isOrderOwnedByEmail(id, userEmail)) {
            return Response.status(Response.Status.FORBIDDEN).entity("You do not have access to this order.").build();
        }

        try {
            byte[] pdf = orderManager.getBillDownload(id);
            return Response.ok(pdf)
                    .header("Content-Disposition", "attachment; filename=\"Rechnung-" + id + ".pdf\"")
                    .header("Content-Type", "application/pdf")
                    .build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .header("Content-Type", "application/pdf")
                    .entity(e.getMessage())
                    .build();
        }
    }

    @GET
    @Path("/{orderId}/ticket/{ticketNumber}")
    @PermitAll
    public Response downloadTicketByIndex(@Context SecurityContext context, @PathParam("orderId") UUID orderId,
            @PathParam("ticketNumber") int ticketNumber, @QueryParam("token") String token) {
        // Determine the user's email from authentication
        String userEmail;
        if (context.getUserPrincipal() != null) {
            // Authenticated via JWT (student)
            if (!(context.getUserPrincipal() instanceof JWTCallerPrincipal jwtPrincipal)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid authentication.").build();
            }
            userEmail = jwtPrincipal.getClaim("email");
        } else if (token != null) {
            // Non-student with token - need to find the email associated with this order
            var order = orderManager.getOrderById(orderId);
            if (order == null) {
                return Response.status(Response.Status.NOT_FOUND).entity("Order not found.").build();
            }
            String orderEmail = order.getCustomer().getMailAddress();
            if (!userManager.checkToken(orderEmail, token)) {
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid access token.").build();
            }
            userEmail = orderEmail;
        } else {
            return Response.status(Response.Status.UNAUTHORIZED).entity("Authentication required.").build();
        }

        // Verify the order belongs to the user
        if (!orderManager.isOrderOwnedByEmail(orderId, userEmail)) {
            return Response.status(Response.Status.FORBIDDEN).entity("You do not have access to this order.").build();
        }

        try {
            byte[] pdf = orderManager.getTicketByIndex(orderId, ticketNumber - 1);
            return Response.ok(pdf)
                    .header("Content-Disposition", "attachment; filename=\"Ticket-" + ticketNumber + ".pdf\"")
                    .header("Content-Type", "application/pdf")
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(e.getMessage()).build();
        } catch (IndexOutOfBoundsException e) {
            return Response.status(Response.Status.NOT_FOUND).entity("Ticket number " + ticketNumber + " not found in order.").build();
        }
    }

    @GET
    @Transactional
    @Path("/all/{email}/{token}")
    @PermitAll
    public Response getOrders(@Context SecurityContext context, @PathParam("email") String email,
            @PathParam("token") String token) {
        String ordersEmail;
        if (context.getUserPrincipal() == null) {
            // Check if token is provided and not empty
            if (token != null && !token.isEmpty()) {
                if (!userManager.checkToken(email, token)) {
                    return Response.ok("Invalid access token.").status(401).build();
                }
            } else {
                return Response.ok("No access token provided.").status(401).build();
            }
            ordersEmail = email;
        } else {
            if (!(context.getUserPrincipal() instanceof JWTCallerPrincipal jwtPrincipal)) {
                return Response.ok("Invalid authentication.").status(401).build();
            }
            ordersEmail = jwtPrincipal.getClaim("email");
        }
        var orders = Arrays.stream(
                orderManager.getOrders(ordersEmail)).map(
                        o -> new OrderDTO(
                                o.getId().toString(),
                                new CustomerDTO(
                                        o.getCustomer().getFirstName(),
                                        o.getCustomer().getLastName(),
                                        o.getCustomer().getMailAddress(),
                                        o.getCustomer().getPhoneNumber(),
                                        o.getCustomer().getSchoolClass(),
                                        o.getCustomer().isMale(),
                                        o.getCustomer().getStreet(),
                                        o.getCustomer().getStreetNumber(),
                                        o.getCustomer().getZipCode(),
                                        o.getCustomer().getTown()),
                                new OrderContentDTO(
                                        o.getStatus().toString(),
                                        o.getOrderDate().toString(),
                                        o.getTickets().stream()
                                                .map(
                                                        t -> new TicketDTO(
                                                                t.getTicketType(),
                                                                null,
                                                                t.isPhysical()))
                                                .collect(Collectors.toCollection(ArrayList::new)),
                                        o.getSeats().stream()
                                                .map(
                                                        t -> new SeatDTO(
                                                                t.getId(),
                                                                t.getXPosition(),
                                                                t.getYPosition(),
                                                                t.getXLength(),
                                                                t.getYLength(),
                                                                t.getPrice(),
                                                                t.getOrder() != null,
                                                                t.getTableName()))
                                                .collect(Collectors.toCollection(ArrayList::new)))))
                .toArray();
        return Response.ok(orders).build();
    }
}
