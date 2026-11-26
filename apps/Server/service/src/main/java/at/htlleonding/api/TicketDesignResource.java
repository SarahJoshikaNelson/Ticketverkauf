package at.htlleonding.api;

import at.htlleonding.TicketDesignManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.TicketDesignDTO;
import at.htlleonding.types.dtos.TicketDesignResponseDTO;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;

@Path("/api/v1/ticket-design")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class TicketDesignResource {
    private final TicketDesignManager ticketDesignManager;

    @GET
    @AdminOnly
    public Response getAllDesigns() {
        try {
            List<TicketDesignResponseDTO> designs = ticketDesignManager.getAllDesigns();
            return Response.ok(designs).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error retrieving designs: " + e.getMessage())
                    .build();
        }
    }

    @PUT
    @Path("/{id}/active")
    @AdminOnly
    public Response toggleActiveDesign(@PathParam("id") UUID id) {
        ticketDesignManager.toggleActiveDesign(id);
        return Response.ok().build();
    }

    @GET
    @Path("/{id}")
    @AdminOnly
    public Response getDesignById(@PathParam("id") UUID id) {
        try {
            TicketDesignResponseDTO design = ticketDesignManager.getDesignById(id);
            if (design != null) {
                return Response.ok(design).build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Design not found")
                        .build();
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error retrieving design: " + e.getMessage())
                    .build();
        }
    }

    @POST
    @AdminOnly
    public Response saveDesign(TicketDesignDTO designDTO) {
        try {
            if (designDTO.name() == null || designDTO.name().trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Design name is required")
                        .build();
            }

            // Check if at least one page has elements
            boolean hasFrontElements = designDTO.frontPage() != null &&
                    designDTO.frontPage().elements() != null &&
                    !designDTO.frontPage().elements().isEmpty();
            boolean hasBackElements = designDTO.backPage() != null &&
                    designDTO.backPage().elements() != null &&
                    !designDTO.backPage().elements().isEmpty();

            if (!hasFrontElements && !hasBackElements) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Design must contain at least one element on front or back page")
                        .build();
            }

            TicketDesignResponseDTO savedDesign = ticketDesignManager.saveDesign(designDTO);
            return Response.status(Response.Status.CREATED)
                    .entity(savedDesign)
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error saving design: " + e.getMessage())
                    .build();
        }
    }

    @PUT
    @Path("/{id}")
    @AdminOnly
    public Response updateDesign(@PathParam("id") UUID id, TicketDesignDTO designDTO) {
        try {
            if (designDTO.name() == null || designDTO.name().trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Design name is required")
                        .build();
            }

            // Check if at least one page has elements
            boolean hasFrontElements = designDTO.frontPage() != null &&
                    designDTO.frontPage().elements() != null &&
                    !designDTO.frontPage().elements().isEmpty();
            boolean hasBackElements = designDTO.backPage() != null &&
                    designDTO.backPage().elements() != null &&
                    !designDTO.backPage().elements().isEmpty();

            if (!hasFrontElements && !hasBackElements) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Design must contain at least one element on front or back page")
                        .build();
            }

            TicketDesignResponseDTO updatedDesign = ticketDesignManager.updateDesign(id, designDTO);
            if (updatedDesign != null) {
                return Response.ok(updatedDesign).build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Design not found")
                        .build();
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error updating design: " + e.getMessage())
                    .build();
        }
    }

    @DELETE
    @Path("/{id}")
    @AdminOnly
    public Response deleteDesign(@PathParam("id") UUID id) {
        try {
            boolean deleted = ticketDesignManager.deleteDesign(id);
            if (deleted) {
                return Response.ok("Design deleted successfully").build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Design not found")
                        .build();
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error deleting design: " + e.getMessage())
                    .build();
        }
    }
}