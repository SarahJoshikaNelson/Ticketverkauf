package at.htlleonding;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@ApplicationScoped
public class EncryptionManager {

    private static final String ALGORITHM = "AES";

    @ConfigProperty(name = "quarkus.mailer.encryption-key", defaultValue = "V2Xp6B9JtqYmNdR4L8vWcAs7FgHw1Kj5")
    String secretKeyConfig;

    private SecretKeySpec secretKeySpec;

    @PostConstruct
    void init() {
        // Ensure key is 32 bytes for AES-256 (or 16 for AES-128). We pad or truncate.
        byte[] key = secretKeyConfig.getBytes(StandardCharsets.UTF_8);
        byte[] validKey = new byte[32];
        System.arraycopy(key, 0, validKey, 0, Math.min(key.length, 32));
        this.secretKeySpec = new SecretKeySpec(validKey, ALGORITHM);
    }

    public String encrypt(String raw) {
        if (raw == null) return null;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            byte[] encrypted = cipher.doFinal(raw.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Error while encrypting data", e);
        }
    }

    public String decrypt(String encrypted) {
        if (encrypted == null) return null;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] raw = cipher.doFinal(Base64.getDecoder().decode(encrypted));
            return new String(raw, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error while decrypting data", e);
        }
    }
}
