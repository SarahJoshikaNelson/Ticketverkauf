package at.htlleonding.api;

import at.htlleonding.SettingManager;
import at.htlleonding.interceptors.AdminOnly;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

@Path("/api/v2/phase")
@RequiredArgsConstructor
public class PhaseResource {
    private final SettingManager settingManager;

    @POST
    @Transactional
    @Path("/")
    @AdminOnly
    public Response setPhase(int phase) {
        settingManager.setPhase(phase);
        return Response.ok().build();
    }

    @GET
    @Transactional
    @Path("/")
    public Response getPhase() {
        return Response.ok(settingManager.getPhase()).build();
    }
}
