"""Dockerfile for EduAllocPro backend — Cloud Run ready."""
FROM python:3.11-slim

WORKDIR /app

# System deps for OR-Tools + ReportLab
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run: PORT env var is set automatically
ENV PORT=8080

# CRITICAL: WORKERS=1 — multiple workers break shared embeddings cache
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
