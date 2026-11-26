package at.htlleonding.api;

import at.htlleonding.StudentManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.Maturant;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Path("/api/v2/students")
@RequiredArgsConstructor
public class StudentResource {
    private static final Logger log = LoggerFactory.getLogger(StudentResource.class);
    
    private final StudentManager studentManager;

    @GET
    @Path("/")
    @AdminOnly
    public Response getAllMaturanten() {
        try {
            List<Maturant> maturanten = studentManager.getAllMaturanten();
            log.info("Returning {} maturanten", maturanten.size());
            return Response.ok(maturanten).build();
        } catch (Exception e) {
            log.error("Error fetching maturanten", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error fetching maturanten: " + e.getMessage())
                    .build();
        }
    }

    @GET
    @Path("/count")
    @AdminOnly
    public Response getMaturantenCount() {
        try {
            long count = studentManager.getMaturantenCount();
            return Response.ok("{\"count\": " + count + "}").build();
        } catch (Exception e) {
            log.error("Error getting maturanten count", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error getting maturanten count: " + e.getMessage())
                    .build();
        }
    }

    @POST
    @Path("/")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createMaturant(Maturant maturant) {
        log.info("Creating new maturant: {}", maturant.getLdapUser());
        try {
            boolean created = studentManager.createMaturant(maturant);
            if (created) {
                return Response.ok("{\"message\": \"Maturant successfully created\"}").build();
            } else {
                return Response.status(Response.Status.CONFLICT)
                        .entity("{\"error\": \"Maturant with this LDAP-User already exists\"}")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error creating maturant", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"Failed to create maturant: " + e.getMessage() + "\"}")
                    .build();
        }
    }

    @POST
    @Path("/upload")
    @AdminOnly
    @Consumes(MediaType.TEXT_PLAIN)
    public Response uploadCSV(String csvContent) {
        log.info("Received CSV upload request");
        try {
            int count = studentManager.uploadMaturantenFromCSV(csvContent);
            return Response.ok("{\"message\": \"Successfully uploaded " + count + " maturanten\", \"count\": " + count + "}").build();
        } catch (Exception e) {
            log.error("Error uploading CSV", e);
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Failed to upload CSV: " + e.getMessage() + "\"}")
                    .build();
        }
    }

    @PUT
    @Path("/{ldapUser}")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateMaturant(@PathParam("ldapUser") String ldapUser, Maturant maturant) {
        log.info("Updating maturant: {}", ldapUser);
        try {
            boolean updated = studentManager.updateMaturant(ldapUser, maturant);
            if (updated) {
                return Response.ok("{\"message\": \"Maturant successfully updated\"}").build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\": \"Maturant not found\"}")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error updating maturant", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"Failed to update maturant: " + e.getMessage() + "\"}")
                    .build();
        }
    }

    @DELETE
    @Path("/{ldapUser}")
    @AdminOnly
    public Response deleteMaturant(@PathParam("ldapUser") String ldapUser) {
        log.info("Deleting maturant: {}", ldapUser);
        try {
            boolean deleted = studentManager.deleteMaturant(ldapUser);
            if (deleted) {
                return Response.ok("{\"message\": \"Maturant successfully deleted\"}").build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\": \"Maturant not found\"}")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error deleting maturant", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"Failed to delete maturant: " + e.getMessage() + "\"}")
                    .build();
        }
    }

    @DELETE
    @Path("/all")
    @AdminOnly
    public Response deleteAllMaturanten() {
        log.info("Deleting all maturanten");
        try {
            long count = studentManager.deleteAllMaturanten();
            return Response.ok("{\"message\": \"All maturanten successfully deleted\", \"count\": " + count + "}").build();
        } catch (Exception e) {
            log.error("Error deleting all maturanten", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"Failed to delete all maturanten: " + e.getMessage() + "\"}")
                    .build();
        }
    }
}

