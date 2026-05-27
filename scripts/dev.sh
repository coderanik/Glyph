#!/bin/bash
set -e

echo "🚀 Starting Glyph Development Environment..."

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Pre-flight checks ──────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install it from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required for LaTeX compilation. Install Docker Desktop."; exit 1; }

# ── Install dependencies if needed ─────────────────────────────
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    (cd frontend && npm install)
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    (cd server && npm install)
fi

# ── Build the LaTeX compiler Docker image ──────────────────────
echo "🐳 Building LaTeX compiler image (glyph-compiler)..."
docker build -t glyph-compiler ./docker

# ── Start the Hono backend server ──────────────────────────────
echo "⚙️  Starting Hono backend (port 8083)..."
(cd server && npm run dev) &

# Give the server a moment to boot before starting the frontend
sleep 2

# ── Start the Next.js frontend ─────────────────────────────────
echo "🌐 Starting Next.js frontend (port 3000)..."
(cd frontend && npm run dev) &

echo ""
echo "✅ Glyph is running!"
echo "   Frontend  → http://localhost:3000"
echo "   Backend   → http://localhost:8083"
echo ""
echo "Press Ctrl+C to stop all services."

wait
