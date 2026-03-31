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

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until docker exec glyph-db-1 pg_isready -h localhost -p 5432 -U glyph > /dev/null 2>&1; do
  echo "Database is still starting..."
  sleep 1
done
echo "Database is ready!"

echo "Starting Backend (API on port 4005)..."
cd backend
export DATABASE_URL="postgresql://glyph:glyph_password@127.0.0.1:5433/glyph"
export REDIS_URL="redis://127.0.0.1:6379"
PORT=4005 cargo run &
cd ..

echo "Starting Frontend..."
cd frontend
npm run dev &
cd ..

echo "Development environment is running."
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:4005"
echo "Press Ctrl+C to stop all services."

wait
