package at.htlleonding;

import at.htlleonding.repositories.StyleRepo;
import at.htlleonding.types.Style;
import at.htlleonding.types.dtos.AiGenerateThemeRequestDTO;
import at.htlleonding.types.dtos.StylesDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Random;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class StyleManager {
    private static final Logger log = LoggerFactory.getLogger(StyleManager.class);
    private StyleRepo styleRepo;
    private AiManager aiManager;

    public Style getStyle() {
        return styleRepo.findById(1);
    }

    @Transactional
    public void updateStyle(StylesDTO style) {
        Style styles = styleRepo.findById(1);
        styles.setPrimary(style.getPrimary());
        styles.setSecondary(style.getSecondary());
        styles.setAccent(style.getAccent());
        styles.setBorderRadius(style.getBorderRadius());
        styles.setBackground(style.getBackground());
        styles.setText(style.getText());
        styleRepo.persist(styles);
    }

    public StylesDTO generateAiTheme(AiGenerateThemeRequestDTO request) {
        Random random = new Random();
        
        // Generate random color hints to encourage variation
        String[] colorFamilies = {"warm tones", "cool tones", "vibrant colors", "muted colors", "pastel shades", "deep saturated colors"};
        String[] moods = {"energetic", "calm", "elegant", "playful", "professional", "modern", "classic", "bold"};
        String[] accents = {"contrasting", "complementary", "analogous", "monochromatic with pop"};
        
        String randomColorHint = colorFamilies[random.nextInt(colorFamilies.length)];
        String randomMood = moods[random.nextInt(moods.length)];
        String randomAccent = accents[random.nextInt(accents.length)];
        int randomVariation = random.nextInt(100);
        
        String systemPrompt = """
            You are a creative color theme designer for a graduation ball ticket system.
            
            CRITICAL: Create a COMPLETELY UNIQUE theme. NO TWO THEMES SHOULD BE IDENTICAL.
            
            OUTPUT FORMAT - Respond with ONLY this JSON (no other text):
            {
              "primary": "#hexcolor",
              "secondary": "#hexcolor",
              "accent": "#hexcolor",
              "text": "#hexcolor",
              "background": "#hexcolor",
              "borderRadius": number
            }
            
            VARIATION REQUIREMENTS:
            1. ALL colors MUST be valid hex codes: # + 6 hex digits (0-9, A-F)
            2. NEVER use the same color scheme twice - vary hue, saturation, lightness
            3. borderRadius: 0-20 (0=sharp, 8=medium, 16=very rounded)
            4. CONTRAST: Ensure text is readable on background
            5. HARMONY: Colors should work together beautifully
            
            COLOR RANGES (vary within these for creativity):
            - Dark backgrounds: #000000 to #2d2d2d (pick ANY shade in between)
            - Light backgrounds: #ebebeb to #ffffff (pick ANY shade in between)
            - Dark text: #0a0a0a to #3d3d3d
            - Light text: #d0d0d0 to #ffffff
            - Primary: ANY color that matches the theme mood
            - Secondary: Should complement primary (NOT the same)
            - Accent: Should POP and draw attention
            
            RESPOND WITH ONLY THE JSON OBJECT!
            """;

        // Create a truly unique prompt each time
        long timestamp = System.currentTimeMillis();
        String uniquePrompt = systemPrompt + 
            "\n\nUSER WANTS: \"" + request.prompt() + "\"" +
            "\n\nVARIATION GUIDANCE (use as inspiration, not rules):" +
            "\n- Explore " + randomColorHint +
            "\n- Theme mood should be " + randomMood +
            "\n- Use " + randomAccent + " color relationships" +
            "\n- Variation seed: " + randomVariation +
            "\n- Timestamp: " + timestamp +
            "\n\nIMPORTANT: Be BOLD and CREATIVE. Don't repeat previous themes!" +
            "\nGenerate a UNIQUE theme JSON now:";
        
        try {
            String rawResponse = aiManager.callApi(uniquePrompt, aiManager.getModel());
            log.info("AI raw response for prompt '{}' (ID: {}): {}", request.prompt(), timestamp, rawResponse);
            
            StylesDTO theme = parseThemeResponse(rawResponse);
            
            // Automatically save the generated theme to the database
            updateStyle(theme);
            log.info("Successfully generated and saved theme for prompt: {}", request.prompt());
            
            return theme;
        } catch (Exception e) {
            log.warn("Primary AI parsing failed for prompt '{}', generating fallback theme: {}", 
                     request.prompt(), e.getMessage());
            
            StylesDTO fallbackTheme = generateFallbackTheme(request.prompt());
            
            // Also save the fallback theme
            updateStyle(fallbackTheme);
            log.info("Successfully generated and saved fallback theme for prompt: {}", request.prompt());
            
            return fallbackTheme;
        }
    }
    
    private StylesDTO parseThemeResponse(String rawResponse) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        
        // Parse OpenRouter API response structure
        JsonNode apiResponse = mapper.readTree(rawResponse);
        
        // Extract content from choices[0].message.content
        String content = null;
        if (apiResponse.has("choices") && apiResponse.get("choices").isArray() && 
            apiResponse.get("choices").size() > 0) {
            JsonNode message = apiResponse.get("choices").get(0).get("message");
            if (message != null && message.has("content")) {
                content = message.get("content").asText();
            }
        }
        
        // If no content found, try direct parsing (fallback for different API formats)
        if (content == null || content.isEmpty()) {
            content = rawResponse;
        }
        
        log.info("Extracted content from AI response: {}", content);
        
        // Clean the content - remove markdown code blocks if present
        String cleanedResponse = content.trim();
        if (cleanedResponse.startsWith("```json")) {
            cleanedResponse = cleanedResponse.substring(7);
        }
        if (cleanedResponse.startsWith("```")) {
            cleanedResponse = cleanedResponse.substring(3);
        }
        if (cleanedResponse.endsWith("```")) {
            cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length() - 3);
        }
        cleanedResponse = cleanedResponse.trim();
        
        // Try to find JSON object if response contains other text
        int jsonStart = cleanedResponse.indexOf('{');
        int jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
        }
        
        log.info("Cleaned theme JSON: {}", cleanedResponse);
        
        JsonNode jsonNode = mapper.readTree(cleanedResponse);
        
        // Validate and extract with defaults
        StylesDTO theme = new StylesDTO();
        theme.setPrimary(getNodeValue(jsonNode, "primary", "#1dc1e2"));
        theme.setSecondary(getNodeValue(jsonNode, "secondary", "#1f2fe0"));
        theme.setAccent(getNodeValue(jsonNode, "accent", "#3e1de2"));
        theme.setText(getNodeValue(jsonNode, "text", "#f5f5f5"));
        theme.setBackground(getNodeValue(jsonNode, "background", "#0a0a0a"));
        theme.setBorderRadius(getNodeIntValue(jsonNode, "borderRadius", 8));
        
        log.info("Generated theme: primary={}, secondary={}, accent={}, text={}, background={}, borderRadius={}", 
            theme.getPrimary(), theme.getSecondary(), theme.getAccent(), 
            theme.getText(), theme.getBackground(), theme.getBorderRadius());
        
        return theme;
    }
    
    private String getNodeValue(JsonNode node, String fieldName, String defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull()) {
            String value = field.asText();
            // Validate hex color format
            if (value.matches("^#[0-9A-Fa-f]{6}$")) {
                return value;
            }
        }
        log.warn("Field {} missing or invalid, using default: {}", fieldName, defaultValue);
        return defaultValue;
    }
    
    private int getNodeIntValue(JsonNode node, String fieldName, int defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull() && field.isNumber()) {
            int value = field.asInt();
            if (value >= 0 && value <= 20) {
                return value;
            }
        }
        log.warn("Field {} missing or invalid, using default: {}", fieldName, defaultValue);
        return defaultValue;
    }
    
    private StylesDTO generateFallbackTheme(String userPrompt) {
        log.info("Generating fallback theme based on prompt: {}", userPrompt);
        
        StylesDTO theme = new StylesDTO();
        String promptLower = userPrompt.toLowerCase();
        
        // Determine if dark or light theme with variations
        boolean isDark = promptLower.contains("dunkel") || promptLower.contains("dark") || 
                         promptLower.contains("schwarz") || promptLower.contains("black") ||
                         promptLower.contains("nacht") || promptLower.contains("night");
        
        boolean isLight = promptLower.contains("hell") || promptLower.contains("light") ||
                          promptLower.contains("bright") || promptLower.contains("white");
        
        // Use prompt hash for variety
        int hash = Math.abs(userPrompt.hashCode());
        
        if (isDark) {
            // Vary dark backgrounds
            String[] darkBgs = {"#0a0a0a", "#121212", "#1a1a1a", "#0d1117", "#161b22"};
            theme.setBackground(darkBgs[hash % darkBgs.length]);
            String[] lightTexts = {"#f5f5f5", "#e8e8e8", "#f0f0f0", "#ffffff", "#e5e5e5"};
            theme.setText(lightTexts[hash % lightTexts.length]);
        } else if (isLight) {
            // Vary light backgrounds
            String[] lightBgs = {"#fafafa", "#ffffff", "#f5f5f5", "#f8f9fa", "#f0f2f5"};
            theme.setBackground(lightBgs[hash % lightBgs.length]);
            String[] darkTexts = {"#1a1a1a", "#2d2d2d", "#1f1f1f", "#0a0a0a", "#333333"};
            theme.setText(darkTexts[hash % darkTexts.length]);
        } else {
            // Auto-decide based on hash
            if (hash % 2 == 0) {
                theme.setBackground("#0a0a0a");
                theme.setText("#f5f5f5");
            } else {
                theme.setBackground("#fafafa");
                theme.setText("#1a1a1a");
            }
        }
        
        // Determine color scheme with variations
        if (promptLower.contains("blau") || promptLower.contains("blue") || promptLower.contains("ozean") || promptLower.contains("ocean")) {
            String[][] blueSchemes = {
                {"#22d3ee", "#0e7490", "#67e8f9"},
                {"#3b82f6", "#1e40af", "#60a5fa"},
                {"#0ea5e9", "#075985", "#38bdf8"},
                {"#06b6d4", "#0e7490", "#22d3ee"}
            };
            String[] scheme = blueSchemes[hash % blueSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else if (promptLower.contains("violett") || promptLower.contains("purple") || promptLower.contains("lila") || promptLower.contains("magenta")) {
            String[][] purpleSchemes = {
                {"#8b5cf6", "#4c1d95", "#a78bfa"},
                {"#a855f7", "#6b21a8", "#c084fc"},
                {"#9333ea", "#581c87", "#a855f7"},
                {"#7c3aed", "#5b21b6", "#8b5cf6"}
            };
            String[] scheme = purpleSchemes[hash % purpleSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else if (promptLower.contains("grün") || promptLower.contains("green") || promptLower.contains("emerald")) {
            String[][] greenSchemes = {
                {"#10b981", "#065f46", "#34d399"},
                {"#22c55e", "#15803d", "#4ade80"},
                {"#059669", "#064e3b", "#10b981"},
                {"#14b8a6", "#0f766e", "#2dd4bf"}
            };
            String[] scheme = greenSchemes[hash % greenSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else if (promptLower.contains("rot") || promptLower.contains("red") || promptLower.contains("crimson")) {
            String[][] redSchemes = {
                {"#ef4444", "#991b1b", "#f87171"},
                {"#dc2626", "#7f1d1d", "#ef4444"},
                {"#f43f5e", "#9f1239", "#fb7185"},
                {"#e11d48", "#881337", "#f43f5e"}
            };
            String[] scheme = redSchemes[hash % redSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else if (promptLower.contains("gold") || promptLower.contains("gelb") || promptLower.contains("yellow") || promptLower.contains("amber")) {
            String[][] goldSchemes = {
                {"#f59e0b", "#92400e", "#fbbf24"},
                {"#eab308", "#854d0e", "#facc15"},
                {"#f97316", "#9a3412", "#fb923c"},
                {"#d97706", "#78350f", "#f59e0b"}
            };
            String[] scheme = goldSchemes[hash % goldSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else if (promptLower.contains("rosa") || promptLower.contains("pink")) {
            String[][] pinkSchemes = {
                {"#ec4899", "#9f1239", "#f472b6"},
                {"#db2777", "#831843", "#f472b6"},
                {"#f472b6", "#be185d", "#fbcfe8"}
            };
            String[] scheme = pinkSchemes[hash % pinkSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        } else {
            // Multiple default elegant themes
            String[][] defaultSchemes = {
                {"#1dc1e2", "#1f2fe0", "#3e1de2"},
                {"#06b6d4", "#6366f1", "#8b5cf6"},
                {"#14b8a6", "#3b82f6", "#a855f7"},
                {"#0ea5e9", "#8b5cf6", "#ec4899"}
            };
            String[] scheme = defaultSchemes[hash % defaultSchemes.length];
            theme.setPrimary(scheme[0]);
            theme.setSecondary(scheme[1]);
            theme.setAccent(scheme[2]);
        }
        
        // Vary border radius based on prompt keywords
        if (promptLower.contains("scharf") || promptLower.contains("sharp") || promptLower.contains("eckig")) {
            theme.setBorderRadius(2);
        } else if (promptLower.contains("rund") || promptLower.contains("round") || promptLower.contains("soft")) {
            theme.setBorderRadius(16);
        } else {
            // Use hash for variety
            int[] radiusOptions = {4, 6, 8, 10, 12};
            theme.setBorderRadius(radiusOptions[hash % radiusOptions.length]);
        }
        
        log.info("Fallback theme generated: primary={}, secondary={}, accent={}, text={}, background={}, borderRadius={}", 
            theme.getPrimary(), theme.getSecondary(), theme.getAccent(), 
            theme.getText(), theme.getBackground(), theme.getBorderRadius());
        
        return theme;
    }
}
