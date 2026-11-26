package at.htlleonding.api;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.repositories.TicketRepo;
import at.htlleonding.types.Ticket;
import at.htlleonding.types.dtos.ActivationErrorDTO;
import at.htlleonding.types.dtos.ErrorDTO;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Path("/api/v2/ticket-activation")

@RequiredArgsConstructor
public class TicketActivationResource {
    private final TicketRepo ticketRepo;

    /**
     * Activates a ticket via switching the tickets' status in the DB (stored in the
     * table field `isActivated`).<br><br>
     *
     * Possible responses:<br>
     * − 204 NO CONTENT − if successful<br>
     * − 400 BAD REQUEST with body { "message": "already activated" } − if the ticket has been already activated<br>
     * − 404 NOT FOUND with body { "message": "ticket not found" } − if the ticket with the given ticket ID does not exist<br>
         * @return Response
     */
    @POST
    @Path("/{ticketId}")
    @Transactional
    public Response activateTicket(@PathParam("ticketId") String ticketId) {
        UUID id;
        try {
            id = UUID.fromString(ticketId);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorDTO("ticket not found"))
                    .build();
        }

        Ticket ticket = ticketRepo.findById(id);

        if (ticket == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorDTO("ticket not found"))
                    .build();
        }

        if (ticket.getOrder().getStatus().equals(OrderStatus.CANCELLED)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorDTO("ticket order cancelled"))
                    .build();
        }

        if (ticket.getOrder().getStatus().equals(OrderStatus.WAITING)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorDTO("ticket not confirmed"))
                    .build();
        }

        if (ticket.getOrder().getStatus().equals(OrderStatus.CONFIRMED)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorDTO("ticket not paid"))
                    .build();
        }

        if (ticket.isActivated()) {
            // Get order information
            String customerName = null;
            if (ticket.getOrder().getCustomer() != null) {
                customerName = ticket.getOrder().getCustomer().getFirstName() + " " + 
                              ticket.getOrder().getCustomer().getLastName();
            }
            
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ActivationErrorDTO(
                        "already activated", 
                        ticket.getActivatedAt(),
                        customerName,
                        ticket.getOrder().getId(),
                        ticket.getOrder().getOrderDate()
                    ))
                    .build();
        }

        ticket.setActivated(true);
        ticket.setActivatedAt(LocalDateTime.now());
        ticketRepo.persist(ticket);

        return Response.noContent().build();
    }
}
