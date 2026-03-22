# ============================================================================
# SikaRemit Backend — Production Dockerfile
# Runs on GCP Cloud Run (built by Cloud Build, no local Docker needed)
# ============================================================================

FROM python:3.11-slim AS base

# Set Django settings module early
ENV DJANGO_SETTINGS_MODULE=core.settings

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies required by psycopg2, Pillow, and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r sikaremit && useradd -r -g sikaremit -d /app -s /sbin/nologin sikaremit

WORKDIR /app

# Force rebuild by adding cache-busting timestamp
RUN echo "BUILD_TIMESTAMP=$(date +%s)" > /tmp/build_info

# Install Python dependencies (cached layer — only re-runs if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y django-prometheus || true && \
    echo "FORCED PROMETHEUS REMOVAL"

# Copy application code
COPY . .

# Copy startup script
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Collect static files (uses whitenoise for serving)
RUN python manage.py collectstatic --noinput --settings=core.settings 2>/dev/null || true

# Create logs directory
RUN mkdir -p /app/logs && chown -R sikaremit:sikaremit /app

# Switch to non-root user
USER sikaremit

# Set Django settings module
ENV DJANGO_SETTINGS_MODULE=core.settings

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/api/v1/health/')" || exit 1

# Use startup script
CMD ["/app/startup.sh"]
