package at.htlleonding.api;

import at.htlleonding.*;
import at.htlleonding.exceptions.InvalidDataException;
import at.htlleonding.exceptions.MissingDataException;
import at.htlleonding.interceptors.PhaseApproved;
import at.htlleonding.types.dtos.ReservationBookingReqDTO;
import jakarta.annotation.security.PermitAll;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/api/v2/reservation")
@PermitAll
@RequiredArgsConstructor
public class BookingResource {
    private final BookingManager bookingManager;
    private final TableManager tableManager;
    private final UserManager userManager;
    private final LayerManager layerManager;
    private final TicketManager ticketManager;

    private static final Logger log = LoggerFactory.getLogger(BookingResource.class);

    @GET
    @Path("/booked-tickets")
    public Response getBookedItemCount() {
        long bookedTickets = bookingManager.calculateBookedTicketCount();
        return Response.ok().entity(bookedTickets).build();
    }

    @POST
    @Transactional
    @Path("/bookOrder")
    @PhaseApproved
    @PermitAll
    public Response bookOrder(@Context SecurityContext context, ReservationBookingReqDTO reservation) { // TODO: dont do Response.ok().status(someNonOkCode)
        log.info("Received bookOrder request");
        log.info("Reservation: {}", reservation);
        log.info("SecurityContext: {}", context);
        try {
            if (context.getUserPrincipal() == null) {
                log.info("No user principal, checking token");
                // Check if token is provided and not empty
                if (reservation.token() != null && !reservation.token().isEmpty() 
                    && !userManager.checkToken(reservation.customer().mailAddress(), reservation.token())) {
                    log.info("Invalid token");
                    return Response.ok("Invalid access token.").status(401).build();
                }

                log.info("Calling bookingManager.book with customer name");
                return Response.ok(bookingManager.book(
                        reservation,
                        reservation.customer().firstName() + " " + reservation.customer().lastName(),
                        ticketManager.getAdditionalChargeForPhysicalTicket()
                )).build();
            } else {
                log.info("Calling bookingManager.book with principal name");
                return Response.ok(bookingManager.book(
                        reservation,
                        context.getUserPrincipal().getName(),
                        ticketManager.getAdditionalChargeForPhysicalTicket()
                )).build();
            }
        } catch (MissingDataException exception) {
            switch (exception.missingDataType) {
                case ITEMS -> {
                    return Response.ok("No items selected while booking process.").status(500).build();
                }
                case CUSTOMER -> {
                    return Response.ok("Your customer is invalid.").status(500).build();
                }
                default -> {
                    return Response.ok("An error occurred while booking.").status(500).build();
                }
            }
        } catch (InvalidDataException exception) {
            return Response.ok("The data provided was invalid").status(500).build();
        }
    }

    @GET
    @Path("/allowed")
    @PhaseApproved
    public Response isAllowedToBook() {
        //TODO add logic for this please
        return Response.ok(true).build();
    }

    @GET
    @Transactional
    @Path("/room/tables/{roomId}")
    public Response getAllTables(@PathParam("roomId") String roomId) {
        return Response.ok(tableManager.getTablesFromRoom(roomId)).build();
    }

    @GET
    @Transactional
    @Path("layers")
    public Response getAllLayers() {
        return Response.ok(layerManager.getLayers()).build();
    }
}
