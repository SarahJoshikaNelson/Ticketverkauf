package at.htlleonding.api;

import at.htlleonding.StyleManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.AiGenerateThemeRequestDTO;
import at.htlleonding.types.dtos.StylesDTO;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/api/v2/styling")
@RequiredArgsConstructor
public class StylingResource {
    private static final Logger log = LoggerFactory.getLogger(StylingResource.class);
    private final StyleManager styleManager;

    @GET
    @Path("/")
    public Response getStyling() {
        return Response.ok(styleManager.getStyle()).build();
    }

    @POST
    @AdminOnly
    @Path("/")
    public Response updateStyling(StylesDTO style) {
        styleManager.updateStyle(style);
        return Response.ok().build();
    }

    @POST
    @Path("/generate-ai-theme")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @AdminOnly
    public Response generateAiTheme(AiGenerateThemeRequestDTO request) {
        try {
            StylesDTO theme = styleManager.generateAiTheme(request);
            return Response.ok(theme).build();
        } catch (RuntimeException e) {
            log.error("Failed to generate AI theme: {}", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"" + e.getMessage() + "\"}").build();
        } catch (Exception e) {
            log.error("An unexpected error occurred during AI theme generation", e);
            return Response.serverError().entity("{\"error\": \"An unexpected error occurred.\"}").build();
        }
    }
}