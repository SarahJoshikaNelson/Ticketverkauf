package at.htlleonding.api;

import at.htlleonding.AdminManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.admin.MailConfigDTO;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v2/mail-config")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class MailConfigResource {

    @Inject
    AdminManager adminManager;

    @GET
    @AdminOnly
    public Response getMailConfig() {
        return Response.ok(adminManager.getMailConfig()).build();
    }

    @POST
    @AdminOnly
    public Response updateMailConfig(MailConfigDTO dto) {
        adminManager.updateMailConfig(dto);
        return Response.ok().build();
    }

    @POST
    @Path("/test")
    @AdminOnly
    public Response testMailConfig(MailConfigDTO dto) {
        try {
            Integer successPort = adminManager.testMailConfig(dto);
            return Response.ok(java.util.Map.of("port", successPort)).build();
        } catch (Exception e) {
            e.printStackTrace();
            String msg = e.getMessage() != null ? e.getMessage() : e.toString();
            // Sanitize or just return a map to let Jackson serialize it properly
            return Response.status(Response.Status.BAD_REQUEST).entity(java.util.Map.of("error", msg)).build();
        }
    }
}
