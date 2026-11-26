package at.htlleonding.api;

import at.htlleonding.MailManager;
import at.htlleonding.UserManager;
import at.htlleonding.types.User;
import at.htlleonding.types.dtos.LoginTokenDTO;
import at.htlleonding.types.dtos.UserLoginDTO;
import at.htlleonding.types.dtos.UserRegisterDTO;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.Claims;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import javax.naming.directory.InitialDirContext;

@Path("/api/v2/user")
@PermitAll
@RequiredArgsConstructor
public class UserResource {
   private final UserManager userManager;
   private final MailManager mailManager;
   
   @GET
   @Path("/validate-email")
   public Response validateEmail(@QueryParam("email") String email) {
      if (email == null || !email.contains("@")) {
         return Response.ok(Map.of("valid", false)).build();
      }
      String domain = email.substring(email.lastIndexOf('@') + 1);
      try {
         InetAddress.getByName(domain);
         return Response.ok(Map.of("valid", true)).build();
      } catch (UnknownHostException e) {
         // A/AAAA lookup failed — try MX records (e.g. *.onmicrosoft.com)
         try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            var ctx = new InitialDirContext(env);
            var mx = ctx.getAttributes(domain, new String[]{"MX"});
            if (mx.get("MX") != null && mx.get("MX").size() > 0) {
               return Response.ok(Map.of("valid", true)).build();
            }
         } catch (Exception ignored) {
         }
         return Response.ok(Map.of("valid", false)).build();
      }
   }

   @POST
   @Path("/send-verification-code")
   public Response sendVerificationCode(@QueryParam("email") String email) {
      if (email == null || !email.contains("@")) {
         return Response.status(Response.Status.BAD_REQUEST)
               .entity(Map.of("sent", false)).build();
      }
      if (!userManager.isUserRegistered(email)) {
         return Response.status(Response.Status.NOT_FOUND)
               .entity(Map.of("sent", false, "message", "Kein Konto mit dieser E-Mail-Adresse gefunden.")).build();
      }
      try {
         String code = userManager.generateVerificationCode(email);
         mailManager.sendVerificationCode(email, code);
         return Response.ok(Map.of("sent", true)).build();
      } catch (Exception e) {
         return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
               .entity(Map.of("sent", false)).build();
      }
   }

   @POST
   @Path("/verify-code")
   public Response verifyCode(@QueryParam("email") String email, @QueryParam("code") String code) {
      if (email == null || code == null) {
         return Response.status(Response.Status.BAD_REQUEST)
               .entity(Map.of("valid", false)).build();
      }
      boolean valid = userManager.verifyCode(email, code);
      return Response.ok(Map.of("valid", valid)).build();
   }

   @POST
   @Path("/register")
   public Response registerUser(UserRegisterDTO user) {
      if (userManager.isUserRegistered(user.email())) {
         return Response.status(Response.Status.CONFLICT)
               .entity("User with this email already exists.")
               .build();
      }
      userManager.getOrCreateUser(user.username(), user.email(), user.password());
      return Response.status(Response.Status.CREATED)
            .entity("User registered successfully.")
            .build();
   }
   
   @POST
   @Path("/login")
   public Response loginUser(UserLoginDTO userDto) {
      User user = userManager.getUser(userDto.email());
      if (user == null) {
         return Response.status(Response.Status.NOT_FOUND)
               .entity("No user with the provided email found.")
               .build();
      }
      if (!BcryptUtil.matches(userDto.password(), user.getPasswordHash())) {
         return Response.status(Response.Status.UNAUTHORIZED)
               .entity("Invalid password.")
               .build();
      }
      String token = Jwt.issuer("https://maturaball.htl-leonding.ac.at/issuer")
            .upn(userDto.email())
            .groups(new HashSet<>(List.of("User")))
            .claim(Claims.email.name(), userDto.email())
            .sign();
      userManager.registerToken(userDto.email(), token);
      return Response.ok(
            new LoginTokenDTO(token)
      ).build();
   }

   @POST
   @Path("/reset-password")
   public Response resetPassword(
         @QueryParam("email") String email,
         @QueryParam("code") String code,
         @QueryParam("newPassword") String newPassword) {
      if (email == null || code == null || newPassword == null || newPassword.length() < 8) {
         return Response.status(Response.Status.BAD_REQUEST)
               .entity(Map.of("success", false, "message", "Ungültige Eingabe.")).build();
      }
      boolean success = userManager.resetPassword(email, code, newPassword);
      if (!success) {
         return Response.status(Response.Status.UNAUTHORIZED)
               .entity(Map.of("success", false, "message", "Ungültiger oder abgelaufener Code.")).build();
      }
      return Response.ok(Map.of("success", true)).build();
   }
}
