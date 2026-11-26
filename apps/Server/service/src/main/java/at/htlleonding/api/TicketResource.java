package at.htlleonding.api;

import at.htlleonding.TicketManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.AdditionalChargeForPhysicalTicketDTO;
import at.htlleonding.types.dtos.ErrorDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Path("/api/v2/ticket")
@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class TicketResource {
    private TicketManager ticketManager;
    @GET
    @Path("/download/{id}")
    public Response getTicketDownload(@PathParam("id") String id) {
        return Response.ok(ticketManager.getTicketDownload(id)).header("Content-Type", "application/pdf").header("Content-Disposition", "attachment; filename=\"ticket.pdf\"").build();
    }

    @AdminOnly
    @PUT
    @Path("/count/{maxTicket}")
    public Response setMaxTicket(@PathParam("maxTicket") int maxTicket) {
        try {
            ticketManager.setMaxTicket(maxTicket);

            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(e.getMessage()).build();
        } catch (Exception e) {
            return Response.status(500).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/count")
    public Response getMaxTicket() {
        return Response.ok(ticketManager.getMaxTicketCount()).build();
    }

    @GET
    @Path("/student")
    public Response getStudentTicketPrice() {
        return Response.ok(ticketManager.getStudentTicketPrice()).build();
    }

    @PUT
    @AdminOnly
    @Path("/student/{price}")
    public Response setStudentTicketPrice(@PathParam("price") double price) {
        ticketManager.setStudentTicketPrice(price);
        return Response.ok().build();
    }

    @GET
    @Path("/extern")
    public Response getExternTicketPrice() {
        return Response.ok(ticketManager.getExternTicketPrice()).build();
    }

    @AdminOnly
    @PUT
    @Path("/extern/{price}")
    public Response setExternTicketPrice(@PathParam("price") double price) {
        ticketManager.setExternTicketPrice(price);
        return Response.ok().build();
    }

    @GET
    @Path("/student/allowed")
    public Response getStudentTicketAllowed(@Context SecurityContext securityContext) {
        if (securityContext == null || securityContext.getUserPrincipal() == null) {
            return Response.ok(false).build();
        }
        return Response.ok(ticketManager.isAllowedToBuyTicket(securityContext.getUserPrincipal().getName())).build();
    }

    @GET
    @Path("/graduate/allowed")
    public Response getGraduateTicketAllowed(@Context SecurityContext securityContext) {
        if (securityContext == null || securityContext.getUserPrincipal() == null) {
            return Response.ok(ticketManager.isFreeTicketPrivileged("")).build();
        }
        return Response.ok(ticketManager.isFreeTicketPrivileged(securityContext.getUserPrincipal().getName())).build();
    }

    @GET
    @Path("/student/price")
    public Response getBoughtTicketCount() {
        return Response.ok(ticketManager.getBoughtTickets()).build();
    }

    @AdminOnly
    @GET
    @Path("/physical")
    public Response getPhysicalTickets(@QueryParam("filter") String filter) {
        if (filter == null || filter.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO("Please provide a filter!")).build();
        }
        if (filter.equalsIgnoreCase("all")) {
            return Response.ok(ticketManager.getAllPhysicalTickets()).build();
        }
        if (filter.equalsIgnoreCase("unprinted")) {
            return Response.ok(ticketManager.getNotYetPrintedPhysicalTickets()).build();
        }
        return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorDTO("The filter provided must be \"unprinted\" or \"all\"!")).build();
    }

    @GET
    @Path("/physical/additional-charge")
    public Response getPhysicalTicketAdditionalCharge() {
        return Response.ok(
                new AdditionalChargeForPhysicalTicketDTO(ticketManager.getAdditionalChargeForPhysicalTicket())
        ).build();
    }

    @AdminOnly
    @PUT
    @Path("/physical/additional-charge/{newPrice}")
    public Response setPhysicalTicketAdditionalCharge(@PathParam("newPrice") double newPrice) {
        ticketManager.setAdditionalChargeForPhysicalTicket(newPrice);
        return Response.ok().build();
    }

    @GET
    @Path("/count-per-order")
    public Response getMaxTicketCountPerOrder() {
        return Response.ok(ticketManager.getMaxTicketCountPerOrder()).build();
    }

    @AdminOnly
    @PUT
    @Path("/count-per-order/{maxTicketCountPerOrder}")
    public Response setMaxTicketCountPerOrder(@PathParam("maxTicketCountPerOrder") int maxTicketCountPerOrder) {
        try {
            ticketManager.setMaxTicketCountPerOrder(maxTicketCountPerOrder);
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(e.getMessage()).build();
        } catch (Exception e) {
            return Response.status(500).entity(e.getMessage()).build();
        }
    }
}

