# Stage 1: Build
FROM node:20-slim AS builder

# Set up workspace
WORKDIR /repo

# Copy package files for workspace structure
COPY package*.json ./
COPY packages/models/package.json ./packages/models/
COPY apps/Client/Web/package.json ./apps/Client/Web/

ARG BUILD_CONFIG=production
ENV BUILD_CONFIG=${BUILD_CONFIG}

# Install dependencies
RUN npm install --include=optional

# Copy source code
COPY packages/models/ ./packages/models/
COPY apps/Client/Web/ ./apps/Client/Web/

# Create tsconfig.build.json for path mapping
WORKDIR /repo/apps/Client/Web
RUN echo '{\n\
  "extends": "./tsconfig.json",\n\
  "compilerOptions": {\n\
    "paths": {\n\
      "@ticket-system/models": ["../../packages/models/src"]\n\
    }\n\
  }\n\
}' > ./tsconfig.build.json

# Build with the specified configuration
RUN npx ng build --configuration=${BUILD_CONFIG}

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /repo/apps/Client/Web/dist/frontend/browser /usr/share/nginx/html

# Copy nginx config
COPY apps/Client/Web/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]