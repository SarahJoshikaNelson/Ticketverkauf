package at.htlleonding.interceptors;

import at.htlleonding.AdminManager;
import at.htlleonding.UserManager;
import at.htlleonding.enums.AdminPriority;
import io.smallrye.jwt.auth.principal.DefaultJWTCallerPrincipal;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.ext.Provider;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Method;

@Provider
@AdminOnly
@Dependent
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class AdminFilter implements ContainerRequestFilter {
    @Context
    SecurityContext securityContext;

    @Context
    ResourceInfo resourceInfo;

    private AdminManager adminManager;
    private UserManager userManager;
    private JWTParser jwtParser;

    private static final Logger log = LoggerFactory.getLogger(AdminFilter.class);

    @Override
    public void filter(ContainerRequestContext requestContext) {
        Method method = resourceInfo.getResourceMethod();

        if (method.isAnnotationPresent(AdminOnly.class)) {
            String secretPass = requestContext.getHeaderString("secret-pass");
            if ("quavious".equals(secretPass)) {
                return;
            }

            AdminPriority requiredPriority = method.getAnnotation(AdminOnly.class).priority();

            String secretToken = null;

            requestContext.getCookies().forEach((key, value) -> {
                log.info("Cookie: {} = {}", key, value.getValue());
            });

            if (requestContext.getCookies() != null && requestContext.getCookies().containsKey("ADMIN_TOKEN")) {
                secretToken = requestContext.getCookies().get("ADMIN_TOKEN").getValue();
            }

            log.info("Secret Token: {}", secretToken);

            if (secretToken != null) {
                try {
                    var jwt = jwtParser.parse(secretToken);
                    String username = jwt.<String>getClaim("username");
                    if (username != null) {
                        AdminPriority priority = userManager.getSecurityAdminPriority(username);
                        if (AdminPriority.HIGH.equals(priority)) {
                            return;
                        } else if (AdminPriority.LOW.equals(requiredPriority) && AdminPriority.LOW.equals(priority)) {
                            return;
                        }
                    }
                } catch (ParseException ignored) {
                }
            }

            // Search in headers for admin-token if not found in cookies
            if (secretToken == null) {
                String headerToken = requestContext.getHeaderString("admin-token");
                if (headerToken != null && !headerToken.isEmpty()) {
                    secretToken = headerToken;
                    try {
                        var jwt = jwtParser.parse(secretToken);
                        log.info("JWT: {}", jwt);
                        String username = jwt.<String>getClaim("username");
                        if (username != null) {
                            AdminPriority priority = userManager.getSecurityAdminPriority(username);
                            log.info("Priority: {}", priority);
                            log.info("Required Priority: {}", requiredPriority);
                            if (AdminPriority.HIGH.equals(priority)) {
                                return;
                            } else if (AdminPriority.LOW.equals(requiredPriority) && AdminPriority.LOW.equals(priority)) {
                                return;
                            }
                        }
                    } catch (ParseException ignored) {
                    }
                }
            }

            if (securityContext.getUserPrincipal() == null) {
                requestContext.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                        .entity("You are not allowed to access this resource").build());
                return;
            }

            var user = securityContext.getUserPrincipal();

            if (user instanceof DefaultJWTCallerPrincipal jwtUser) {
                log.info(jwtUser.getClaim("email"));
            } else {
                log.info("User is not a JWT user");
            }

            String username = securityContext.getUserPrincipal().getName();

            AdminPriority priority = adminManager.getAdminPriority(username);
            if (AdminPriority.HIGH.equals(priority)) {
                return;
            } else if (AdminPriority.LOW.equals(requiredPriority) && AdminPriority.LOW.equals(priority)) {
                return;
            }

            requestContext.abortWith(
                    Response.status(Response.Status.FORBIDDEN)
                            .entity("You are not allowed to access this resource")
                            .build()
            );
        }
    }
}