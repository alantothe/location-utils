#!/bin/bash

# Start all services in parallel
echo "🚀 Starting all services..."

# Start Python service in background
echo "🐍 Starting Python alt-text service..."
bun run dev:python &
PYTHON_PID=$!

# Wait a moment for Python service to start
sleep 3

# Start main dev server
echo "⚡ Starting Bun dev server..."
bun run dev &
BUN_PID=$!

echo ""
echo "✅ All services started!"
echo "🐍 Python service (PID: $PYTHON_PID)"
echo "⚡ Bun dev server (PID: $BUN_PID)"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $PYTHON_PID 2>/dev/null
    kill $BUN_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on interrupt
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
