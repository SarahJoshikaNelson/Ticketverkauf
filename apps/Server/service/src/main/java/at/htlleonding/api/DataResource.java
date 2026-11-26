package at.htlleonding.api;

import at.htlleonding.DataManager;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.DataDTO;
import at.htlleonding.types.dtos.ImageUploadDTO;
import at.htlleonding.types.dtos.admin.ScheduleEntryRequestDTO;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Path("/api/v2/data")
@RequiredArgsConstructor
public class DataResource {
    private final DataManager dataManager;

    @GET
    @Path("/")
    public Response getData() {
        return Response.ok(dataManager.getData()).build();
    }

    @GET
    @Path("/images")
    public Response getImages() {
        return Response.ok(dataManager.getData().getImages()).build();
    }

    @GET
    @Path("/gif")
    public Response getGif() {
        return Response.ok("{\"url\": \"" + dataManager.getData().getGifUrl() + "\"}").build();
    }

    @GET
    @Path("/schedule")
    public Response getSchedule() {
        return Response.ok(dataManager.getData().getSchedule()).build();
    }

    @POST
    @AdminOnly
    @Path("/")
    public Response updateData(DataDTO data) {
        dataManager.updateData(data);
        return Response.ok().build();
    }

    @POST
    @AdminOnly
    @Path("/schedule")
    public Response updateSchedule(ScheduleEntryRequestDTO scheduleEntryRequestDTO) {
        dataManager.updateSchedule(scheduleEntryRequestDTO.schedules());
        return Response.ok().build();
    }

    @POST
    @AdminOnly
    @Path("/images")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateImages(ImageUploadDTO imageUploadDTO) {
        dataManager.updateImages(Arrays.asList(imageUploadDTO.images()));
        return Response.ok().build();
    }

}
