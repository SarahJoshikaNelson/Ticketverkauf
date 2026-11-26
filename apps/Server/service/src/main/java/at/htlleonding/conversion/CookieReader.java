package at.htlleonding.conversion;

import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;

@ApplicationScoped
public class CookieReader {
    private static final Logger log = LoggerFactory.getLogger(CookieReader.class);

    public String getCookie(String[] headerString, String targetValue) {
        try {
            var cookies = Arrays.stream(headerString)
                .filter(cookieString -> cookieString.contains("="))  // Only process valid cookie strings
                .map(Cookie::fromString)
                .filter(cookie -> cookie != null && cookie.name().equals(targetValue))
                .map(Cookie::value)
                .findFirst();
            
            return cookies.orElse(null);
        } catch (Exception e) {
            log.error("Error parsing cookies: {}", e.getMessage());
            log.error("Cookie strings: {}", Arrays.toString(headerString));
            return null;
        }
    }

    public record Cookie(String name, String value) {
        public static Cookie fromString(String cookieString) {
            try {
                String[] parts = cookieString.split("=", 2);  // Limit to 2 parts in case value contains =
                if (parts.length >= 2) {
                    String name = parts[0].trim();
                    String value = parts[1].trim();
                    return new Cookie(name, value);
                } else {
                    log.error("Invalid cookie format: {}", cookieString);
                    return null;
                }
            } catch (Exception e) {
                log.error("Error parsing cookie string '{}': {}", cookieString, e.getMessage());
                return null;
            }
        }
    }
}
