#!/bin/bash
set -e

# Resolve repository root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "🚀 Starting Glyph Development Environment..."

# ── Pre-flight checks ──────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install it from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required for LaTeX compilation. Install Docker Desktop."; exit 1; }

# ── Load environment variables from root .env ──────────────────
if [ ! -f .env ]; then
    echo "⚠️  No root .env file found!"
    echo "📝 Creating a template .env file at the repository root from .env.example..."
    cp .env.example .env
    echo "👉 Please edit the .env file at the root to add your Clerk keys and Gemini API key."
    echo "   Then run ./scripts/dev.sh again."
    exit 1
fi

echo "🔑 Loading environment variables from root .env..."
while IFS= read -r line || [ -n "$line" ]; do
    # Strip carriage returns and leading/trailing whitespace
    trimmed=$(echo "$line" | tr -d '\r' | xargs)
    # Ignore empty lines and comments
    if [[ -n "$trimmed" && ! "$trimmed" =~ ^# ]]; then
        export "$trimmed"
    fi
done < .env

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Install dependencies if needed ─────────────────────────────
if [ ! -d "node_modules" ]; then
    echo "📦 Installing workspace dependencies at root..."
    npm install
fi

# ── Build the LaTeX compiler Docker image ──────────────────────
echo "🐳 Building LaTeX compiler image (glyph-compiler)..."
docker build -t glyph-compiler ./docker

# ── Start the Hono backend server ──────────────────────────────
echo "⚙️  Starting Hono backend (port 8083)..."
(cd server && npm run dev) &

# ── Start the LaTeX Compile Worker ─────────────────────────────
echo "🤖 Starting LaTeX compile worker..."
(cd server && npm run worker) &

# Give the servers a moment to boot before starting the frontend
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
