#!/bin/bash
set -e

PORT=3001
export DB_PORT=5433
CLEANED_UP=0
COMPOSE_FILE="docker-compose.test.yaml"

# Point Prisma to the ephemeral test database
export DATABASE_URL="postgresql://postgres:postgres@localhost:$DB_PORT/openblog_test"

get_pid_on_port() {
  ss -lptn "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+' | head -n 1
}

is_openblog_nextjs() {
  local pid=$1
  if [ -z "$pid" ]; then return 1; fi
  local cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
  local cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || echo "")
  [[ ("$cmdline" == *"node"* || "$cmdline" == *"next"*) && ("$cwd" == *"OpenBlog"* || "$cmdline" == *"OpenBlog"*) ]]
}

kill_port_3001_surgical() {
  local pid=$(get_pid_on_port)
  if [ -z "$pid" ]; then return; fi
  if is_openblog_nextjs "$pid"; then
    kill -9 "$pid" 2>/dev/null || true
    for i in {1..5}; do
      [ -z "$(get_pid_on_port)" ] && return
      sleep 1
    done
  else
    echo "CRITICAL: Port $PORT occupied by unrecognized process (PID: $pid)." >&2
    exit 1
  fi
}

cleanup() {
  if [ "$CLEANED_UP" -eq 1 ]; then return; fi
  CLEANED_UP=1

  # 1. Stop Next.js server
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
  fi
  kill_port_3001_surgical

  # 2. Spin down the test container and remove volumes
  docker compose -f "$COMPOSE_FILE" down -v > /dev/null 2>&1
}

trap cleanup EXIT INT TERM

# Initial cleanup to ensure a clean state
kill_port_3001_surgical

# --- Database Orchestration ---
docker compose --progress quiet -f "$COMPOSE_FILE" up -d

until docker exec openblog-db-test pg_isready -h localhost -U postgres > /dev/null 2>&1; do
  sleep 1
done

docker exec openblog-db-test psql -U postgres -c 'DROP DATABASE IF EXISTS openblog_test;' > /dev/null
docker exec openblog-db-test psql -U postgres -c 'CREATE DATABASE openblog_test;' > /dev/null
pnpm --silent run prisma-test migrate deploy > /dev/null 2>&1

# --- Run Tests ---
pnpm --silent run test:unit --reporter=agent

# --- Run Integration Tests ---
export DATABASE_URL="postgresql://postgres:postgres@localhost:$DB_PORT/openblog_test"
export E2E_TESTING=true
pnpm --silent run test:integration --reporter=agent

export BASE_URL="http://localhost:3001"
DATABASE_URL="postgresql://postgres:postgres@localhost:$DB_PORT/openblog_test" pnpm --silent run build:test > /dev/null 2>&1
SIGN_UP_ENABLED=true DISABLE_RATE_LIMITING=true E2E_TESTING=true pnpm --silent exec next start -p 3001 > /dev/null 2>&1 &
SERVER_PID=$!

TIMEOUT=60
ELAPSED=0
while ! curl -s http://localhost:$PORT > /dev/null 2>&1; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ $ELAPSED -ge $TIMEOUT ]; then echo "ERROR: Server timeout"; exit 1; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then echo "ERROR: Server died"; exit 1; fi
done

set +e
BASE_URL=http://localhost:3001 pnpm run test:e2e --reporter=list
E2E_EXIT_CODE=$?
set -e

exit $E2E_EXIT_CODE
