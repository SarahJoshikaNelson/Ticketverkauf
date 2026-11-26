package at.htlleonding.api;

import at.htlleonding.BackupManager;
import at.htlleonding.interceptors.AdminOnly;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@Path("/api/v2/backup")
@RequiredArgsConstructor
public class BackupResource {
    private static final Logger log = LoggerFactory.getLogger(BackupResource.class);
    private final BackupManager backupManager;
    private final JWTParser jwtParser;

    @POST
    @Path("/export")
    @AdminOnly
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response exportData(Map<String, Boolean> categories) {
        try {
            var backup = backupManager.exportData(categories);
            return Response.ok(backup).build();
        } catch (Exception e) {
            log.error("Export failed", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Export failed: " + e.getMessage())).build();
        }
    }

    @POST
    @Path("/import")
    @AdminOnly
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response importData(Map<String, Object> backupData) {
        try {
            backupManager.importData(backupData);
            return Response.ok(Map.of("message", "Import completed successfully")).build();
        } catch (Exception e) {
            log.error("Import failed", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Import failed: " + e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/reset")
    @AdminOnly
    @Transactional
    @Produces(MediaType.APPLICATION_JSON)
    public Response resetData(@Context SecurityContext securityContext, @Context HttpHeaders headers) {
        try {
            String ldapAdminIdToKeep = null;
            if (securityContext != null && securityContext.getUserPrincipal() != null) {
                ldapAdminIdToKeep = securityContext.getUserPrincipal().getName();
            }
            String securityAdminUsernameToKeep = readSecurityAdminUsernameFromJwt(headers);
            backupManager.resetAllData(ldapAdminIdToKeep, securityAdminUsernameToKeep);
            return Response.ok(Map.of("message", "All transactional data has been reset")).build();
        } catch (Exception e) {
            log.error("Reset failed", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Reset failed: " + e.getMessage())).build();
        }
    }

    /**
     * Dashboard auth often validates via {@code ADMIN_TOKEN} / {@code admin-token} without populating {@link SecurityContext}.
     */
    private String readSecurityAdminUsernameFromJwt(HttpHeaders headers) {
        String token = null;
        if (headers.getCookies() != null && headers.getCookies().containsKey("ADMIN_TOKEN")) {
            token = headers.getCookies().get("ADMIN_TOKEN").getValue();
        }
        if (token == null || token.isEmpty()) {
            token = headers.getHeaderString("admin-token");
        }
        if (token == null || token.isEmpty()) {
            return null;
        }
        try {
            var jwt = jwtParser.parse(token);
            return jwt.getClaim("username");
        } catch (ParseException e) {
            return null;
        }
    }
}
