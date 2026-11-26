package at.htlleonding.api;

import at.htlleonding.SalesManager;
import at.htlleonding.interceptors.AdminOnly;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@ApplicationScoped
@Path("/api/v2/sales/profit")
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class SalesResource {
    private SalesManager salesManager;

    @GET
    @Path("/")
    @AdminOnly
    public Response getProfit() {
        double profit = salesManager.getFullProfit();
        return Response.ok().entity(profit).build();
    }

    @GET
    @Path("/detail")
    @AdminOnly
    public Response getProfitDetail() {
        return Response.ok().entity(salesManager.getFullProfitDetailed()).build();
    }

    @GET
    @Path("/possible")
    @AdminOnly
    public Response getProfitPossible() {
        return Response.ok().entity(salesManager.getFullPossibleProfitDetailed()).build();
    }
}
