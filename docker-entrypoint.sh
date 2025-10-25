#!/bin/bash
set -e

echo "🟢 Starting Flask API on port 30010..."
nohup python app.py > flask.log 2>&1 &

sleep 4

echo "🟣 Starting React UI on port 30012..."
npm run dev -- --host 0.0.0.0 --port 30012

# Keep container running
wait
