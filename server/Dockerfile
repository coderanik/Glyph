FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

# Install dependencies for building
RUN npm ci --workspace=server --include=dev

# Copy server source code
COPY server ./server

# Build the TypeScript project
RUN npm run build -w server

# Production stage
FROM node:20-alpine

WORKDIR /app


# Copy package configuration and built output
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

WORKDIR /app/server

EXPOSE 8083

CMD ["node", "dist/src/index.js"]
