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

# Set timezone to UTC
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

# Create volume mount points for persistent data
RUN mkdir -p /data /cron && \
    chmod 755 /data /cron

# Create cron job script
RUN echo '#!/bin/sh' > /app/cron-job.sh && \
    echo '# Read seed and generate TOTP code' >> /app/cron-job.sh && \
    echo 'if [ ! -f /data/seed.txt ]; then' >> /app/cron-job.sh && \
    echo '    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - ERROR: Seed not found" > /cron/last_code.txt' >> /app/cron-job.sh && \
    echo '    exit 1' >> /app/cron-job.sh && \
    echo 'fi' >> /app/cron-job.sh && \
    echo 'TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")' >> /app/cron-job.sh && \
    echo 'RESPONSE=$(wget -qO- http://localhost:8080/generate-2fa)' >> /app/cron-job.sh && \
    echo 'CODE=$(echo "$RESPONSE" | grep -o "\"code\":\"[0-9]*\"" | cut -d"\"" -f4)' >> /app/cron-job.sh && \
    echo 'if [ -n "$CODE" ]; then' >> /app/cron-job.sh && \
    echo '    echo "$TIMESTAMP - 2FA Code: $CODE" > /cron/last_code.txt' >> /app/cron-job.sh && \
    echo 'else' >> /app/cron-job.sh && \
    echo '    echo "$TIMESTAMP - ERROR: Failed to generate code" > /cron/last_code.txt' >> /app/cron-job.sh && \
    echo 'fi' >> /app/cron-job.sh && \
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
    echo '# Start cron daemon' >> /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo 'echo "✓ Cron daemon started"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start API server' >> /app/start.sh && \
    echo 'echo "✓ Starting API server on port 8080..."' >> /app/start.sh && \
    echo 'node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 8080
EXPOSE 8080

# Create volumes
VOLUME ["/data", "/cron"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start both cron and API server
CMD ["/app/start.sh"]