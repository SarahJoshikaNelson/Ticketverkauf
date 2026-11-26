# Stage 1: Build
FROM node:26.13.1-slim AS builder

# Set up workspace
WORKDIR /repo

# Copy package files for workspace structure
COPY package*.json ./
COPY packages/models/package.json ./packages/models/
COPY apps/Client/Order/package.json ./apps/Client/Order/

ARG BUILD_CONFIG=production
ENV BUILD_CONFIG=${BUILD_CONFIG}

# Install dependencies
RUN npm install --include=optional

# Copy source code
COPY packages/models/ ./packages/models/
COPY apps/Client/Order/ ./apps/Client/Order/

# Create tsconfig.build.json for path mapping
WORKDIR /repo/apps/Client/Order
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
COPY --from=builder /repo/apps/Client/Order/dist/ticket-system/client-order/browser /usr/share/nginx/html

# Copy nginx config
COPY apps/Client/Order/nginx.conf /etc/nginx/conf.d/default.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
