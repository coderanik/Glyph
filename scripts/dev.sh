#!/bin/bash
set -e

echo "Starting TeXable Development Environment..."

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

echo "Starting Backend..."
cd backend
cargo run &
cd ..

echo "Starting Frontend..."
cd frontend
npm run dev -- --host &
cd ..

echo "Development environment is running."
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:3000"
echo "Press Ctrl+C to stop all services."

wait
