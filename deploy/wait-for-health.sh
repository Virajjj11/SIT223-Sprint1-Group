#!/bin/sh
# Usage: wait-for-health.sh <url> [max_attempts]
# Polls a URL every 2 seconds until it answers, or fails after max_attempts.
URL="$1"
MAX="${2:-30}"
i=1
while [ "$i" -le "$MAX" ]; do
  if curl -fsS "$URL" > /dev/null 2>&1; then
    echo "Healthy: $URL (attempt $i)"
    exit 0
  fi
  echo "Waiting for $URL ... ($i/$MAX)"
  sleep 2
  i=$((i + 1))
done
echo "ERROR: $URL did not become healthy"
exit 1
