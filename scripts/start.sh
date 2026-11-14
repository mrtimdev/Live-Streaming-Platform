#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose up -d --build
echo "Live Streaming Platform started."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8080/api/health"
echo "RTMP:     rtmp://localhost:1935/live"
echo "HLS:      http://localhost:8888/live"
