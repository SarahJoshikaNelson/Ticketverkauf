## Setup & Installation

To run the project locally, make sure the following software is installed:

### 1. Prerequisites

- **JDK 27** – Required to run the Quarkus backend.
- **Node.js 26.13.1** – JavaScript runtime.
- **npm 11.2.0** – Package manager.
- **Docker Desktop** – Required to run the PostgreSQL database.

### 2. Database Setup

Start Docker Desktop and create the PostgreSQL database:

```bash
docker run --name leoticketingdb \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=tickettrade \
  -p 5432:5432 \
  -d postgres
```

Make sure the database container is running before starting the application.

### 3. Install Dependencies

Navigate to the project root directory and execute:

```bash
rm -rf node_modules package-lock.json
npm install
```

Make the Gradle wrapper executable:

```bash
chmod +x apps/Server/gradlew
```

### 4. Start the Application

From the project root directory, run:

```bash
npm run dev
```

This starts the development environment for the project.

### Important Notes

- Make sure the installed JDK and Node.js versions match the required versions.
- Docker Desktop must be running.
- PostgreSQL must be available on port `5432`.
- Run `npm install` from the project root, not from an individual application folder.
