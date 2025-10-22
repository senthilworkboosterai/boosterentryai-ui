#!/bin/bash
set -e

echo "🟢 Starting Flask API on port 5050..."
nohup python app.py > flask.log 2>&1 &

sleep 4

echo "🟣 Starting React UI (Vite) on port 5173..."
npm run dev -- --host 0.0.0.0
