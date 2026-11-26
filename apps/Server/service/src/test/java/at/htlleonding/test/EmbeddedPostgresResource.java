package at.htlleonding.test;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

public class EmbeddedPostgresResource implements QuarkusTestResourceLifecycleManager {
    
    private EmbeddedPostgres postgres;

    @Override
    public Map<String, String> start() {
        try {
            postgres = EmbeddedPostgres.builder()
                    .setPort(0) // Random port
                    .start();
            
            String jdbcUrl = postgres.getJdbcUrl("postgres", "postgres");
            
            return Map.of(
                    "quarkus.datasource.jdbc.url", jdbcUrl,
                    "quarkus.datasource.username", "postgres",
                    "quarkus.datasource.password", "postgres"
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to start embedded PostgreSQL", e);
        }
    }

    @Override
    public void stop() {
        if (postgres != null) {
            try {
                postgres.close();
            } catch (IOException e) {
                // Ignore
            }
        }
    }
}


