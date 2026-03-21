#!/bin/bash
# ============================================================================
# SikaRemit Celery Beat Entrypoint
# Runs as a separate Cloud Run service for scheduled task scheduling
# ============================================================================

set -e

echo "Starting Celery Beat scheduler..."

exec celery -A core beat \
    --loglevel=info \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
