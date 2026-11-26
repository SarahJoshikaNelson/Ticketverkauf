# Stage 1: Build
FROM node:26.13.1-slim AS builder

# Set up workspace
WORKDIR /repo

# Copy package files for workspace structure
COPY package*.json ./
COPY packages/models/package.json ./packages/models/
COPY packages/processors/package.json ./packages/processors/
COPY apps/Client/Scanner/package.json ./apps/Client/Scanner/

ARG VITE_MODE=production
ENV VITE_MODE=${VITE_MODE}

# Install dependencies
RUN npm install --include=optional

# Copy source code
COPY packages/models/ ./packages/models/
COPY packages/processors/ ./packages/processors/
COPY apps/Client/Scanner/ ./apps/Client/Scanner/

# Build
WORKDIR /repo/apps/Client/Scanner
RUN npm run build:${VITE_MODE}

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /repo/apps/Client/Scanner/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/Client/Scanner/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]