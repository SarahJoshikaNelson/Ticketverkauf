package at.htlleonding.conversion;

import at.htlleonding.types.Table;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class WebSocketSendTable {
    private final String message;
    private final Table[] content;

    public JsonObject toJson() {
        JsonObjectBuilder builder = Json.createObjectBuilder();
        builder.add("message", message);
        JsonArrayBuilder arrayBuilder = Json.createArrayBuilder();
        for (Table table : content) {
            arrayBuilder.add(table.toJson());
        }
        builder.add("content", arrayBuilder);
        return builder.build();
    }
}