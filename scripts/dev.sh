#!/bin/bash
set -e

echo "Starting Glyph Development Environment..."

# Function to wrap up background jobs
cleanup() {
    echo "Shutting down..."
    kill $(jobs -p)
    docker compose down
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting Database & Redis..."
docker compose up -d

echo "Starting Backend (API on port 4000)..."
cd backend
PORT=4000 cargo run &
cd ..

echo "Starting Frontend..."
cd frontend
npm run dev &
cd ..

echo "Development environment is running."
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:4000"
echo "Press Ctrl+C to stop all services."

wait
