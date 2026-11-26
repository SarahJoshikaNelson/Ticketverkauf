# HTL-Leonding ticketing software

This is the backend of the ticketing software which shall be used at prom of the following years.

## Running the application manually

1. Start a postgres database on port 5432 (standard for postgresql) and configure login data in application.properties
   in __interface__ subproject; You can do so by running following commands:

```
docker pull postgres:latest
docker run --name <docker-id> -e POSTGRES_PASSWORD=<your-pass> -d postgres:latest
```

2. You can Start the application by running the following commands in the root directory of the project:

```
./gradlew build
./gradlew :service:quarkusDev
```

## Running the application via docker

not yet configured

## Viewing Endpoints via Swagger-Ui

The endpoints can be viewed at `http://localhost:8080/swag` after startup