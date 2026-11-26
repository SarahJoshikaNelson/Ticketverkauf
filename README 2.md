# Leoticketing
Ticketing System for HTL-Leonding by Eros Klein, Leo Breneis, Katharina Minihuber

## Quick Introduction
This project is a ticketing system for the yearly prom of __HTL-Leonding__. It is a web application that allows users to buy tickets for the prom and allows admins to manage the tickets and the customers. To make things easier for the customers, they can verify via their __keycloak account__ and so on get tickets cheaper. In the future this project shall be __highly customizable__ so next years prom team can use it again without modifying the code. Another highly anticipated feature is __online payment__ to get rid of the mess that happens every year with the cash payments.

A full documentation can be found in all the markdown files in [here](./docs).

## Sprint-Planning
- [tree taiga](https://tree.taiga.io/project/eros-klein-kartenverkauf/backlog)

## Necessary Packages
- [Node.js (we use v11.2.0)](https://nodejs.org/)
- [JDK21](https://www.oracle.com/java/technologies/javase-jdk21-downloads.html)

## Used Technologies
- [Angular](https://angular.io/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Quarkus](https://quarkus.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [School's Keycloak](https://www.keycloak.org/)
- [TurboRepo](https://turbo.build/)

## Project Structure
```bash
├── apps
│   ├── Client
│   │   ├── Dashboard (React-Admin-Dashboard)
│   │   │   └── ...
│   │   ├── Validation (React-Validation-Frontend)
│   │   │   └── ...
│   │   ├── Shop (React-Shop-Frontend)
│   │   │   └── ...
│   │   ├── Order (Angular-Order-Frontend)
│   │   │   └── ...
│   │   └── Web (Angular-Web-Frontend)
│   │       └── ...
│   └── Server (Quarkus)
│       ├── api
│       │   └── ...
│       ├── interface
│       │   └── ...
│       ├── logic
│       │   └── ...
│       └── service
│           └── ...
├── Docker (Docker-Configuration)
│   └── docker-compose.yml
├── package.json
├── packages
│   └── ...
├── README.md
├── README (Outdated).md
└── turbo.json
```

## Setup

### Running locally

- First you need to run a postgres database (Base settings are admin/admin/tickettrade on 5432)
```bash
docker run -d \
  --name leoticketingdb \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=tickettrade \
  -p 5432:5432 \
  postgres:latest
```
- This project is built as a monorepo using [TurboRepo](https://turbo.build/), so you can just run `npm run dev` or `turbo dev` to start the development server.
- To build the project run `npm run build` or `turbo build`.
- To test the project run `npm run test` or `turbo test`.
- Ports used will be
  - 4200: Web-Frontend
  - 4201: Order-Frontend
  - 5173: Admin-Dashboard
  - 5174: Scanner-Frontend
  - 5175: Shop-Frontend
  - 8080: Backend
  - 8443: Backend (SSL)
- Stripe webhooks can be locally forwarded for testing; in this project this can be easily achieved by installing the stripe cli and then running following command:
```bash
stripe listen --forward-to localhost:8080/api/v2/checkout/webhook
```

### Docker

- Use following docker-compose file:
```yml
services:
  db_dev:
    image: postgres:17.6
    container_name: postgres-db-dev
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin
      POSTGRES_DB: tickettrade
    ports:
      - "5555:5432"
    volumes:
      - postgres-dev-data:/var/lib/postgresql/data
    networks:
      - app-dev-network

  backend_dev:
    image: erosklein/htl-leo-ticket-backend:dev
    container_name: backend-dev
    ports:
      - "5080:8080"
      - "5443:8443"
    environment:
      DB_HOST: db_dev
      DB_PORT: 5432
      DB_USER: admin
      DB_PASSWORD: admin
      DB_NAME: tickettrade
      ADMIN_ROOT_NAME: Eros-Klein
      ADMIN_ROOT: if210052
      ORDER_URL: https://order.dev.ballkoenig.store
      SHOP_URL: https://shop.dev.ballkoenig.store
    depends_on:
      - db_dev
    networks:
      - app-dev-network

  web-frontend-dev:
    image: erosklein/ticket-system-client-web:dev
    container_name: frontend-dev
    ports:
      - "5000:80"
    depends_on:
      - backend_dev
    networks:
      - app-dev-network

  admin-frontend-dev:
    image: erosklein/ticket-system-dashboard-web:dev
    container_name: admin-frontend-dev
    ports:
      - "5001:80"
    depends_on:
      - backend_dev
    networks:
      - app-dev-network

  order-frontend-dev:
    image: erosklein/ticket-system-client-order:dev
    container_name: order-frontend-dev
    ports:
      - "5002:80"
    depends_on:
      - backend_dev
    networks:
      - app-dev-network
    
  scanner-frontend-dev:
    image: erosklein/ticket-system-scanner:dev
    container_name: scanner-frontend-dev
    ports:
      - "5003:80"
    depends_on:
      - backend_dev
    networks:
      - app-dev-network

  shop-frontend-dev:
    image: erosklein/ticket-system-shop-web:dev
    container_name: shop-frontend-dev
    ports:
      - "5004:80"
    depends_on:
      - backend_dev
    networks:
      - app-dev-network

networks:
  app-dev-network:
    driver: bridge

volumes:
  postgres-dev-data:
    driver: local
```

## Tips for development
- Since we are using TailwindCSS 4.0 (which is rather new), you need to specify a config file if using VSCode, otherwise you won't get any autocompletion.
  - Create the file `.vscode/settings.json` in the root directory of the project and add the following content:
  ```json
  {
    "tailwindCSS.experimental.configFile": "./apps/Client/Dashboard/src/App.css"
  }
  ```
  - This applies to the TailwindCSS IntelliSense VSCode extension.
- First debugging steps  
  - If there are issues occuring on build right after cloning try running following command on a fresh clone:
```bash
npm install --legacy-peer-deps
```
  - If thats not the fix you are looking for you are probably missing some .env files or the rsa-private-key in `Server/service/src/main/resources`. Note: You can always generate a new key-pair by replacing the public key and generating a new keystore.jks. (In Case the key has been lost)
