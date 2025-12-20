# ============================================
# Stage 1: Builder (Prepare dependencies)
# ============================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# ============================================
# Stage 2: Runtime (Final image)
# ============================================
FROM node:18-alpine

# Install system dependencies
# - Update package manager
# - Install cron daemon
# - Install timezone data
# - Clean up caches
RUN apk update && \
    apk add --no-cache tzdata dcron && \
    rm -rf /var/cache/apk/*

# Configure timezone
# - Create symlink to UTC timezone
# - Set TZ environment variable
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Set working directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY package.json ./
COPY server.js ./
COPY student_private.pem ./
COPY scripts/ ./scripts/

# Create volume mount points
# - Create /data directory
# - Create /cron directory
# - Set permissions (755)
RUN mkdir -p /data /cron && \
    chmod 755 /data /cron

# Create cron job script
RUN echo '#!/bin/sh' > /app/cron-job.sh && \
    echo '# Cron job to generate TOTP every minute' >> /app/cron-job.sh && \
    echo 'cd /app && /usr/local/bin/node scripts/log_2fa_cron.js >> /cron/last_code.txt 2>&1' >> /app/cron-job.sh && \
    chmod +x /app/cron-job.sh

# Install cron job (runs every minute)
# Set permissions to 0644 as required
RUN echo "* * * * * /app/cron-job.sh" > /etc/crontabs/root && \
    chmod 0644 /etc/crontabs/root

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "Starting PKI-Based 2FA Microservice..."' >> /app/start.sh && \
    echo 'echo "============================================"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start cron daemon in background' >> /app/start.sh && \
    echo 'crond -b -l 2 2>&1' >> /app/start.sh && \
    echo 'echo "✓ Cron daemon started"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start API server (foreground)' >> /app/start.sh && \
    echo 'echo "✓ Starting API server on port 8080..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# EXPOSE 8080
EXPOSE 8080

# Create volumes
VOLUME ["/data", "/cron"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start both cron and API server
CMD ["sh", "-c", "crond -b && exec node server.js"]
