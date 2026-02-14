# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ cairo-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Rebuild native modules for Alpine/Linux
RUN npm rebuild better-sqlite3

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies + TypeScript (needed for tsx at runtime)
# tsx needs TypeScript to transpile .ts files
RUN npm ci --omit=dev && \
    npm install --no-save typescript && \
    npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/.next ./.next
RUN mkdir -p ./public
COPY --from=builder /app/public/ ./public/
COPY server.ts ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY src ./src

# Create data directory for SQLite with proper permissions
RUN mkdir -p /app/data && \
    chown -R node:node /app

# Create non-root user for security (node user already exists in node image)
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start app with memory and CPU constraints
# tsx allows running TypeScript files directly
CMD ["node", "--max-old-space-size=512", "-r", "tsx", "server.ts"]
