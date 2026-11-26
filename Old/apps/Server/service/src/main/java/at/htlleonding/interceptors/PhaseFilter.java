package at.htlleonding.interceptors;

import at.htlleonding.SettingManager;
import at.htlleonding.StudentManager;
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.ext.Provider;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.io.IOException;

@PhaseApproved
@Provider
@Dependent
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class PhaseFilter implements ContainerRequestFilter {
    private StudentManager studentManager;
    private SettingManager settingManager;

    @Context
    SecurityContext securityContext;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        // Phase 2: Allow all requests
        if (settingManager.getPhase() == 2) {
            return;
        }

        // Phase 1: Only allow authenticated graduates
        if (settingManager.getPhase() == 1) {
            // Check if user is authenticated (logged in with Keycloak)
            if (securityContext.getUserPrincipal() != null) {
                String username = securityContext.getUserPrincipal().getName();
                if (username != null && studentManager.isGraduate(username.toUpperCase())) {
                    // User is authenticated and is a graduate - allow access
                    return;
                }
                // User is authenticated but not a graduate - deny access
                requestContext.abortWith(
                        Response
                                .status(Response.Status.FORBIDDEN)
                                .entity("You are not allowed to access this resource").build()
                );
                return;
            }
            // User is not authenticated (getUserPrincipal() is null)
            // Allow them to pass through - the endpoint will handle token-based authentication
            // This ensures the filter doesn't block unauthenticated token-based requests
            return;
        }

        // Default: Deny access if phase is not 1 or 2
        requestContext.abortWith(
                Response
                        .status(Response.Status.FORBIDDEN)
                        .entity("You are not allowed to access this resource").build()
        );
    }

}
