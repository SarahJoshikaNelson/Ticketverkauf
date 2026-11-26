# Stage 1: Build
FROM node:26.13.1-slim AS builder

# Set up workspace
WORKDIR /repo

# Copy package files for workspace structure
COPY package*.json ./
COPY apps/Client/Shop/package.json ./apps/Client/Shop/

ARG VITE_MODE=prod
ENV VITE_MODE=${VITE_MODE}

# Install dependencies
RUN npm install --include=optional

# Copy source code
COPY apps/Client/Shop/ ./apps/Client/Shop/

# Build
WORKDIR /repo/apps/Client/Shop
RUN npm run build -- --mode ${VITE_MODE}

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /repo/apps/Client/Shop/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/Client/Shop/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
