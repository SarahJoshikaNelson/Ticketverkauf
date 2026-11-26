# Stage 1: Build
FROM node:26.13.1-slim AS builder

# Set up workspace
WORKDIR /repo

# Copy package files for workspace structure
COPY package*.json ./
COPY packages/models/package.json ./packages/models/
COPY packages/processors/package.json ./packages/processors/
COPY apps/Client/Dashboard/package.json ./apps/Client/Dashboard/

ARG VITE_MODE=production
ENV VITE_MODE=${VITE_MODE}

# Install dependencies
RUN npm install --include=optional

# Copy source code
COPY packages/models/ ./packages/models/
COPY packages/processors/ ./packages/processors/
COPY apps/Client/Dashboard/ ./apps/Client/Dashboard/

# Build
WORKDIR /repo/apps/Client/Dashboard
RUN npm run build -- --mode ${VITE_MODE}

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /repo/apps/Client/Dashboard/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/Client/Dashboard/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]