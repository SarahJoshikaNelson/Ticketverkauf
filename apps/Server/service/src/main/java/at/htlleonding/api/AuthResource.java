package at.htlleonding.api;

import at.htlleonding.UserManager;
import at.htlleonding.enums.AdminPriority;
import at.htlleonding.interceptors.AdminOnly;
import at.htlleonding.types.dtos.LoginTokenDTO;
import at.htlleonding.types.dtos.SecurityLoginDTO;
import at.htlleonding.types.dtos.SecurityRegisterDTO;
import at.htlleonding.types.dtos.SecurityTokensDTO;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import lombok.RequiredArgsConstructor;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Path("/api/v2/auth")
@RequiredArgsConstructor
public class AuthResource {
    private final UserManager userManager;
    private final JWTParser jwtParser;

    @Context
    UriInfo uriInfo;

    @POST
    @Path("/register")
    public Response register(SecurityRegisterDTO registerDTO) {
        userManager.createSecurityAdmin(registerDTO.getUsername(), registerDTO.getPassword(), registerDTO.getPriority() != null ? registerDTO.getPriority() : AdminPriority.LOW);
        return Response.status(Response.Status.CREATED).build();
    }

    @POST
    @Path("/login")
    public Response login(SecurityLoginDTO loginDTO) {
        String token;
        try {
            token = userManager.authenticateSecurityAdmin(loginDTO.getUsername(), loginDTO.getPassword());
        } catch (RuntimeException ex) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        if (token == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
        String refreshToken = userManager.generateRefreshToken(loginDTO.getUsername());
        String encodedRefreshToken = URLEncoder.encode(refreshToken, StandardCharsets.UTF_8);
        boolean isSecure = uriInfo != null && "https".equalsIgnoreCase(uriInfo.getRequestUri().getScheme());

        StringBuilder cookieBuilder = new StringBuilder()
            .append("ADMIN_TOKEN=").append(encodedToken)
            .append("; Path=/")
            .append("; Max-Age=600")
            .append("; HttpOnly")
            .append("; Secure; SameSite=None; Domain=.ballkoenig.dev");

        StringBuilder refreshCookieBuilder = new StringBuilder()
            .append("ADMIN_REFRESH_TOKEN=").append(encodedRefreshToken)
            .append("; Path=/")
            .append("; Max-Age=").append(7 * 24 * 60 * 60)
            .append("; HttpOnly")
            .append("; Secure; SameSite=None; Domain=.ballkoenig.dev");

        String cookieValue = cookieBuilder.toString();
        String refreshCookieValue = refreshCookieBuilder.toString();

        if(!isSecure) {
            return Response.ok(new SecurityTokensDTO(token, refreshToken))
                .build();
        }

        return Response.ok()
            .header("set-cookie", cookieValue)
            .header("set-cookie", refreshCookieValue)
            .build();
    }

    @GET
    @AdminOnly(priority = AdminPriority.LOW)
    @Path("/test")
    public Response test() {
        return Response.ok().build();
    }

    @POST
    @Path("/refresh")
    public Response refresh(@Context HttpHeaders headers, LoginTokenDTO refreshTokenDTO) {
        boolean isSecure = uriInfo != null && "https".equalsIgnoreCase(uriInfo.getRequestUri().getScheme());
        String refreshToken = Optional.ofNullable(headers)
            .map(HttpHeaders::getCookies)
            .map(cookies -> cookies.get("admin-refresh-token"))
            .map(jakarta.ws.rs.core.Cookie::getValue)
            .orElse(null);

        if (refreshToken == null && refreshTokenDTO != null) {
            refreshToken = refreshTokenDTO.token();
        }

        if (refreshToken == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        try {
            var jwt = jwtParser.parse(refreshToken);
            if (!"refresh".equals(jwt.<String>getClaim("token_type"))) {
                return Response.status(Response.Status.UNAUTHORIZED).build();
            }
            String username = jwt.<String>getClaim("username");
            if (username == null || userManager.getSecurityAdminPriority(username) == null) {
                return Response.status(Response.Status.UNAUTHORIZED).build();
            }

            String accessToken = userManager.generateAccessToken(username);
            String newRefreshToken = userManager.generateRefreshToken(username);

            if (!isSecure) {
                return Response.ok(new SecurityTokensDTO(accessToken, newRefreshToken)).build();
            }

            String encodedAccessToken = URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
            String encodedRefreshToken = URLEncoder.encode(newRefreshToken, StandardCharsets.UTF_8);

            String accessCookie = new StringBuilder()
                .append("admin-token=").append(encodedAccessToken)
                .append("; Path=/")
                .append("; Max-Age=600")
                .append("; HttpOnly")
                .append("; Secure; SameSite=None")
                .toString();

            String refreshCookie = new StringBuilder()
                .append("admin-refresh-token=").append(encodedRefreshToken)
                .append("; Path=/")
                .append("; Max-Age=").append(7 * 24 * 60 * 60)
                .append("; HttpOnly")
                .append("; Secure; SameSite=None")
                .toString();

            return Response.ok()
                .header("Set-Cookie", accessCookie)
                .header("Set-Cookie", refreshCookie)
                .build();
        } catch (ParseException e) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
    }
}
