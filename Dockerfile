# ── Stage 1: build the React frontend ───────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: python runtime ──────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpcap-dev \
        gcc \
        hashcat && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cached unless requirements change)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Compile parser.c for Linux (replaces the macOS arm64 binary in the repo)
RUN gcc -O2 -o /app/backend/parser /app/backend/parser.c

WORKDIR /app/backend

EXPOSE 8080

CMD ["python3", "-u", "app.py"]
