#!/bin/bash
# 启动 Celery Worker

cd "$(dirname "$0")"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}$(pwd)"

echo "Starting Celery worker..."
echo "PYTHONPATH: $PYTHONPATH"

celery -A tasks.celery_app worker --loglevel=info
