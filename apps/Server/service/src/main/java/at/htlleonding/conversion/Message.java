package at.htlleonding.conversion;

import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonWriter;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.io.IOException;
import java.io.StringWriter;

@Setter
@Getter
@RequiredArgsConstructor
public class Message {
    private final JsonObject json;

    @Override
    public String toString() {
        try(StringWriter writer = new StringWriter()) {
            try (JsonWriter jsonWriter = Json.createWriter(writer)) {
                jsonWriter.write(json);
                return writer.toString();
            }
        } catch (IOException e) {
            throw new RuntimeException("IO Exception: ", e);
        }
    }
}