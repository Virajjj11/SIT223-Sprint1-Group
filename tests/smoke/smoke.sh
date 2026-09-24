#!/bin/sh
# Post-deployment smoke tests, run against a live environment.
# Usage: BASE_URL=http://host.docker.internal:3001 sh tests/smoke/smoke.sh
set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
echo "Running smoke tests against $BASE_URL"

echo "1. Health endpoint"
curl -fsS "$BASE_URL/health" | grep '"status":"ok"'

echo "2. Home page is served"
curl -fsS "$BASE_URL/" | grep -q "Unit Task Tracker"

echo "3. Create a task"
curl -fsS -X POST -H 'Content-Type: application/json' \
  -d '{"title":"Smoke test task","priority":"high"}' "$BASE_URL/api/tasks" | grep '"id"'

echo "4. Invalid input is rejected with 400"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"title":""}' "$BASE_URL/api/tasks")
[ "$STATUS" = "400" ] || { echo "Expected 400, got $STATUS"; exit 1; }

echo "5. Summary endpoint"
curl -fsS "$BASE_URL/api/tasks/summary" | grep '"total"'

echo "6. Prometheus metrics are exposed"
curl -fsS "$BASE_URL/metrics" | grep -q "http_requests_total"

echo "All smoke tests passed for $BASE_URL"
