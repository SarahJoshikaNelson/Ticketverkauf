package at.htlleonding;

import at.htlleonding.repositories.StringSettingRepo;
import at.htlleonding.types.StringSetting;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.Json;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class AiManager {
    StringSettingRepo stringSettingRepo;

    public void storeToken(String token) {
        StringSetting setting = stringSettingRepo.findById("AI_TOKEN");
        if (setting == null) {
            setting = new StringSetting();
            setting.setKey("AI_TOKEN");
            setting.setValue(token);
            stringSettingRepo.persist(setting);
            return;
        }
        setting.setValue(token);
        stringSettingRepo.getEntityManager().merge(setting);
    }

    public String getToken() {
        StringSetting setting = stringSettingRepo.findById("AI_TOKEN");
        if (setting == null) {
            return null;
        }
        return setting.getValue();
    }

    private static final String DEFAULT_MODEL = "openai/gpt-4o-mini";

    public void storeModel(String model) {
        StringSetting setting = stringSettingRepo.findById("AI_MODEL");
        if (setting == null) {
            setting = new StringSetting();
            setting.setKey("AI_MODEL");
            setting.setValue(model);
            stringSettingRepo.persist(setting);
            return;
        }
        setting.setValue(model);
        stringSettingRepo.getEntityManager().merge(setting);
    }

    public String getModel() {
        StringSetting setting = stringSettingRepo.findById("AI_MODEL");
        if (setting == null) {
            return DEFAULT_MODEL;
        }
        return setting.getValue();
    }

    /**
     * Calls the OpenRouter Chat Completions API and returns the raw response body.
     *
     * @param prompt the user prompt
     * @param model the OpenRouter model id (e.g. "openai/gpt-4o-mini")
     * @return raw JSON response body
     */
    public String callApi(String prompt, String model) {
        String token = getToken();
        if (token == null) {
            throw new RuntimeException("AI token not found");
        }

        String payload = Json.createObjectBuilder()
            .add("model", model)
            .add("messages", Json.createArrayBuilder()
                .add(Json.createObjectBuilder()
                    .add("role", "user")
                    .add("content", prompt)))
            .build()
            .toString();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://openrouter.ai/api/v1/chat/completions"))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        try(var client = HttpClient.newHttpClient()) {
            return client
                .send(request, HttpResponse.BodyHandlers.ofString())
                .body();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to call OpenRouter API", e);
        }
    }
}
