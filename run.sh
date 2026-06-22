#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════╗"
echo "║        Wifye — WiFi Analyzer         ║"
echo "╚══════════════════════════════════════╝"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR/backend"

# Install Python dependencies if needed
if ! python3 -c "import flask, scapy" 2>/dev/null; then
  echo "→ Installing Python dependencies..."
  pip3 install -r requirements.txt
fi

# Compile the C parser if needed
if [ ! -f parser ] || [ parser.c -nt parser ]; then
  echo "→ Compiling C parser..."
  gcc -O2 -o parser parser.c && echo "  ✓ parser compiled"
fi

cd "$ROOT_DIR/frontend"

# Install frontend dependencies if needed
if [ ! -d node_modules ]; then
  echo "→ Installing frontend dependencies..."
  npm install
fi

# Build the React app if it's missing or stale
if [ ! -d dist ] || [ package.json -nt dist ] || [ -n "$(find src -newer dist 2>/dev/null)" ]; then
  echo "→ Building frontend..."
  npm run build
fi

cd "$ROOT_DIR/backend"

echo "→ Starting server on http://localhost:8080"
echo "→ Open http://localhost:8080 in your browser"
echo ""
echo "  (Actively changing the UI? Run 'npm run dev' in frontend/ for hot reload —"
echo "   it proxies /api requests to this server on :8080.)"
echo ""
python3 app.py
