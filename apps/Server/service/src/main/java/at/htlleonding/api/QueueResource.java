package at.htlleonding.api;

import at.htlleonding.QueueManager;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

@Path("/api/v2/queue")
@RequiredArgsConstructor
public class QueueResource {
    private final QueueManager queueManager;

    @GET
    @Path("/size")
    public Response getQueueSize() {
        return Response.ok(queueManager.getQueueSize()).build();
    }

    @PUT
    @Path("/size/{size}")
    public Response setQueueSize(@PathParam("size") int size) {
        queueManager.setQueueSize(size);
        return Response.ok().build();
    }

    @GET
    @Path("/duration")
    public Response getReservationDuration() {
        return Response.ok(queueManager.getReservationDuration()).build();
    }

    @PUT
    @Path("/duration/{duration}")
    public Response setReservationDuration(@PathParam("duration") int duration) {
        queueManager.setReservationDuration(duration);
        return Response.ok().build();
    }

    @GET
    @Path("/confirmation-duration")
    public Response getConfirmationDuration() {
        return Response.ok(queueManager.getConfirmationDuration()).build();
    }

    @PUT
    @Path("/confirmation-duration/{duration}")
    public Response setConfirmationDuration(@PathParam("duration") int duration) {
        queueManager.setConfirmationDuration(duration);
        return Response.ok().build();
    }
}