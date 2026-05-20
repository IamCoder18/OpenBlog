#!/bin/bash
set -e

PORT=3001
DB_PORT=5433
COMPOSE_FILE="docker-compose.test.yaml"

# Point Prisma to the ephemeral test database
export DATABASE_URL="postgresql://postgres:postgres@localhost:$DB_PORT/openblog_test"
export E2E_TESTING=true

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
  # Stop Next.js server if running
  kill_port_3001_surgical
  # Spin down the test container
  docker compose -f "$COMPOSE_FILE" down -v > /dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

# Initial cleanup
kill_port_3001_surgical

# --- Database Orchestration ---
docker compose --progress quiet -f "$COMPOSE_FILE" up -d

until docker exec openblog-db-test pg_isready -h localhost -U postgres > /dev/null 2>&1; do
  sleep 1
done

docker exec openblog-db-test psql -U postgres -c 'DROP DATABASE IF EXISTS openblog_test;' > /dev/null
docker exec openblog-db-test psql -U postgres -c 'CREATE DATABASE openblog_test;' > /dev/null
pnpm --silent run prisma-test migrate deploy > /dev/null

# --- Run Integration Tests ---
pnpm --silent run vitest --run --config vitest.integration.config.ts --reporter=verbose