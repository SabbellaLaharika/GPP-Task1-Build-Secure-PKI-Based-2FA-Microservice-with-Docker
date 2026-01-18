# ============================================
# Stage 1: Builder (Dependencies only)
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for caching
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production


# ============================================
# Stage 2: Runtime (Final Image)
# ============================================
FROM node:18-alpine

# ------------------------------------------------
# Environment
# ------------------------------------------------
ENV TZ=UTC
WORKDIR /app

# ------------------------------------------------
# System dependencies
# - dcron : cron daemon
# - tzdata: timezone support
# ------------------------------------------------
RUN apk add --no-cache \
      tzdata \
      dcron \
      curl \
      jq \
      wget && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone


# ------------------------------------------------
# Copy Node.js dependencies
# ------------------------------------------------
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# ------------------------------------------------
# Copy application code
# ------------------------------------------------
COPY server.js ./
COPY request-seed.js ./
COPY scripts/ ./scripts/

# NOTE: In production, mount private keys via volume or secrets
COPY student_private.pem ./

# ------------------------------------------------
# Volumes
# ------------------------------------------------
RUN mkdir -p /data /cron && \
    chmod 755 /data /cron

VOLUME ["/data", "/cron"]

# ------------------------------------------------
# Cron job (runs every minute)
# ------------------------------------------------
RUN echo '* * * * * cd /app && node scripts/log_2fa_cron.js >> /cron/last_code.txt 2>&1' \
    > /etc/crontabs/root && \
    chmod 0644 /etc/crontabs/root

# ------------------------------------------------
# Startup script (single source of truth)
# ------------------------------------------------
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "Starting PKI-Based 2FA Microservice"' >> /app/start.sh && \
    echo 'echo "------------------------------------"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# One-time encrypted seed bootstrap' >> /app/start.sh && \
    echo 'if [ ! -f /app/encrypted_seed.txt ]; then' >> /app/start.sh && \
    echo '  echo "🔑 Encrypted seed not found. Requesting from instructor API..."' >> /app/start.sh && \
    echo '  node /app/request-seed.js || echo "⚠️ Seed request failed, continuing anyway"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "🔑 Encrypted seed already exists. Skipping request."' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start cron in background' >> /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo 'echo "✓ Cron started"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Node.js server (foreground)' >> /app/start.sh && \
    echo 'echo "✓ API server running on port 8080"' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# ------------------------------------------------
# Networking
# ------------------------------------------------
EXPOSE 8080

# ------------------------------------------------
# Healthcheck
# ------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080 || exit 1

# ------------------------------------------------
# Entrypoint
# ------------------------------------------------
CMD ["/app/start.sh"]
