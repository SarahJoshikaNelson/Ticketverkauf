FROM gradle:9.8.2-jdk27 AS build
WORKDIR /project

# Copy gradle files first for better layer caching
COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY gradle.properties .
COPY build.gradle .
COPY api/build.gradle api/
COPY interface/build.gradle interface/
COPY logic/build.gradle logic/
COPY service/build.gradle service/

# Copy source code
COPY api/src api/src
COPY interface/src interface/src
COPY logic/src logic/src
COPY service/src service/src

# Build the application
RUN gradle build -x test --profile --no-daemon

# Runtime image
FROM eclipse-temurin:27-jre
WORKDIR /deployment

# Copy the built artifacts
COPY --from=build /project/service/build/quarkus-app/lib/ lib/
COPY --from=build /project/service/build/quarkus-app/*.jar .
COPY --from=build /project/service/build/quarkus-app/app/ app/
COPY --from=build /project/service/build/quarkus-app/quarkus/ quarkus/

# Set the entrypoint
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]