package at.htlleonding.api;

import at.htlleonding.SettingManager;
import at.htlleonding.WaitingManager;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

@Path("/api/v2/waiting")
@RequiredArgsConstructor
public class WaitingResource {
    private final WaitingManager waitingManager;
    private final SettingManager settingManager;

    @GET
    @Path("/{sessionId}")
    public Response getInFrontOfSessionHolder(@PathParam("sessionId") String sessionId) {
        return Response.ok(waitingManager.inFrontOfSessionHolder(sessionId)).build();
    }

    @GET
    @Path("/{sessionId}/pass")
    public Response mayPass(@PathParam("sessionId") String sessionId) {
        if (waitingManager.mayPass(sessionId)) {
            return Response.ok().build();
        }
        else {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
    }

    @GET
    @Path("/duration")
    public Response getReservationDuration() {
        return Response.ok(settingManager.getReservationDuration()).build();
    }

    @DELETE
    @Path("/{sessionId}")
    public Response deleteActiveReservation(@PathParam("sessionId") String sessionId) {
        waitingManager.removeActiveReservation(sessionId);
        return Response.ok().build();
    }
}
