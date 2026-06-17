#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════╗"
echo "║        Wifye — WiFi Analyzer         ║"
echo "╚══════════════════════════════════════╝"

cd "$(dirname "$0")/backend"

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

echo "→ Starting server on http://localhost:8080"
echo "→ Open http://localhost:8080 in your browser"
echo ""
python3 app.py
