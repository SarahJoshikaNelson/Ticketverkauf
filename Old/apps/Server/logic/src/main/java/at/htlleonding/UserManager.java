package at.htlleonding;

import at.htlleonding.enums.AdminPriority;
import at.htlleonding.repositories.SecurityAdminRepo;
import at.htlleonding.repositories.UserRepo;
import at.htlleonding.types.SecurityAdmin;
import at.htlleonding.types.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import io.vertx.core.impl.ConcurrentHashSet;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class UserManager {
    private UserRepo userRepository;
    private SecurityAdminRepo securityAdminRepository;

    private final ConcurrentHashMap<String, ConcurrentHashSet<String>> userTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, VerificationEntry> verificationCodes = new ConcurrentHashMap<>();
    private static final String MAIL_ADDRESS_STRING = "mailAddress";
    private static final String USERNAME_STRING = "username";

    private record VerificationEntry(String code, long expiresAt) {}

    @Transactional
    public User getOrCreateUser(String username, String email) {
        return getOrCreateUser(username, email, null);
    }

    @Transactional
    public User getOrCreateUser(String username, String email, String password) {
        var user = userRepository.find(MAIL_ADDRESS_STRING, email).firstResult();
        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setMailAddress(email);
            if (password != null) {
                user.setPasswordHash(BcryptUtil.bcryptHash(password));
            }
            userRepository.persist(user);
        }
        return user;
    }

    @Transactional
    public void createSecurityAdmin(String username, String password, AdminPriority priority) {
        SecurityAdmin admin = new SecurityAdmin();
        admin.setUsername(username);
        admin.setPasswordHash(BcryptUtil.bcryptHash(password));
        admin.setPriority(priority);
        securityAdminRepository.persist(admin);
    }

    public AdminPriority getSecurityAdminPriority(String username) {
        SecurityAdmin admin = securityAdminRepository.find(USERNAME_STRING, username).firstResult();
        if (admin == null) {
            return null;
        }
        return admin.getPriority();
    }

    public boolean isAuthenticated(String username, String password) {
        SecurityAdmin admin = securityAdminRepository.find(USERNAME_STRING, username).firstResult();
        if (admin == null) {
            return false;
        }
        return BcryptUtil.matches(password, admin.getPasswordHash());
    }

    public String authenticateSecurityAdmin(String username, String password) {
        if (!isAuthenticated(username, password)) {
            throw new RuntimeException("Invalid username or password");
        }

        return generateAccessToken(username);
    }

    public String generateAccessToken(String username) {
        return Jwt.issuer("https://maturaball.htl-leonding.ac.at/issuer")
                .upn(username)
                .groups(new HashSet<>(List.of("Low-Admin")))
                .claim(USERNAME_STRING, username)
                .claim("token_type", "access")
                .expiresIn(Duration.ofMinutes(10))
                .sign();
    }

    public String generateRefreshToken(String username) {
        return Jwt.issuer("https://maturaball.htl-leonding.ac.at/issuer")
                .upn(username)
                .groups(new HashSet<>(List.of("Low-Admin")))
                .claim(USERNAME_STRING, username)
                .claim("token_type", "refresh")
                .expiresIn(Duration.ofDays(7))
                .sign();
    }

    @Transactional
    public boolean isUserRegistered(String email) {
        return userRepository.find(MAIL_ADDRESS_STRING, email).firstResult() != null;
    }

    @Transactional
    public User getUser(String email) {
        return userRepository.find(MAIL_ADDRESS_STRING, email).firstResult();
    }

    public void registerToken(String email, String token) {
        userTokens.computeIfAbsent(email, k -> new ConcurrentHashSet<>()).add(token);
    }

    public boolean checkToken(String email, String token) {
        return userTokens.getOrDefault(email, new ConcurrentHashSet<>()).contains(token);
    }

    public String generateVerificationCode(String email) {
        String code = String.format("%06d", new java.security.SecureRandom().nextInt(1_000_000));
        verificationCodes.put(email.toLowerCase(), new VerificationEntry(code, System.currentTimeMillis() + 600_000));
        return code;
    }

    public boolean verifyCode(String email, String code) {
        var entry = verificationCodes.get(email.toLowerCase());
        if (entry == null) return false;
        if (System.currentTimeMillis() > entry.expiresAt()) {
            verificationCodes.remove(email.toLowerCase());
            return false;
        }
        if (entry.code().equals(code)) {
            verificationCodes.remove(email.toLowerCase());
            return true;
        }
        return false;
    }

    @Transactional
    public boolean resetPassword(String email, String code, String newPassword) {
        if (!verifyCode(email, code)) {
            return false;
        }
        User user = userRepository.find(MAIL_ADDRESS_STRING, email).firstResult();
        if (user == null) {
            return false;
        }
        user.setPasswordHash(BcryptUtil.bcryptHash(newPassword));
        return true;
    }
}
