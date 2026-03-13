#!/bin/bash
# ============================================================================
# SikaRemit Celery Worker Entrypoint
# Runs as a separate Cloud Run service for background task processing
# ============================================================================

set -e

echo "Starting Celery worker..."

exec celery -A core worker \
    --loglevel=info \
    --concurrency=2 \
    --max-tasks-per-child=100 \
    --without-heartbeat \
    --without-mingle \
    --without-gossip
