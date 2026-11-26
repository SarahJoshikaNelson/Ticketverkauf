# Quick start (local)

Requirements: **JDK 27**, **Node 26.13.1** (`nvm use` reads .nvmrc), Docker (for Postgres).

1. Start Postgres (admin/admin/tickettrade on 5432):
   docker run -d --name leoticketingdb -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=tickettrade -p 5432:5432 postgres:latest
2. From this folder: `npm install` then `npm run dev`

## What was changed (no app source code touched)
Toolchain
- Node 26.13.1: .nvmrc, `engines` in package.json, all client Dockerfiles, GitHub workflows
- JDK 27: sourceCompatibility/targetCompatibility, server Dockerfile (gradle:9.8.2-jdk27 / eclipse-temurin:27-jre), GitHub workflows
- Gradle wrapper 8.9 -> 9.8.2 (first Gradle that supports running on Java 27)
- Quarkus 3.15.1 -> 3.40.2 (gradle.properties; same 3.x line, so same APIs/RESTEasy classic)
- Lombok 1.18.34 -> 1.18.49 (JDK 27 support)
- kordamp jandex plugin 0.11.0 -> 2.3.0 (Gradle 9 compatible)
Fixes
- `dependsOn jandex` -> `dependsOn tasks.named('jandex')` in all 4 server modules
- Order client browserslist reduced to modern browsers (fixes esbuild zone.js error)
- Generated fresh rsaPrivateKey.pem + publicKey.pem in service/src/main/resources (dev only!)

Verified: all 5 frontends (Order, Web, Dashboard, Shop, Scanner) build on Node 26.13.1.
NOT verified: server build on JDK 27 (Gradle downloads were not reachable where this was prepared).
