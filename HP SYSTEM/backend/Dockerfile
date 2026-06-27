# ──────────────────────────────────────────────────────────────────────────────
# HP SYSTEM — Production Dockerfile
# Multi-stage build for optimized production image
# ──────────────────────────────────────────────────────────────────────────────

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1: Dependencies
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ libpq

WORKDIR /app

# Copy package files first (for layer caching)
COPY backend/package*.json ./
RUN npm ci --only=production

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2: Builder
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

# Copy source code
COPY backend/ ./

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3: Production Runner
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

# Add dumb-init for proper signal handling
RUN apk add --no-cache dumb-init libpq

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

 Empirical UX research for
USER nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/package*.json ./

# Copy application code
COPY --chown=nodejs:nodejs backend/ ./

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Use dumb-init to handle signals properly
dumb-init, "node", "server.js" ]

# ═══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT VARIABLES (set at runtime via docker-compose or K8s)
# ═══════════════════════════════════════════════════════════════════════════════
# These should be provided at runtime, not baked into the image:
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# REDIS_URL, REDIS_PASSWORD
# JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH
# ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_KEY2
# etc.
