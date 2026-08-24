#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenBlog Installer
# ─────────────────────────────────────────────────────────────────────────────
# One-line install:
#   curl -fsSL https://openblog.aaravlabs.com/install | bash
#
# Downloads `docker-compose.prod.yaml` from the latest GitHub release (or uses
# an existing copy in the current directory), prompts for the few values that
# matter to your deployment, generates fresh secrets, brings the stack up,
# and bootstraps the first admin user.
#
# Re-runs are idempotent: if OpenBlog is already running, the installer
# pulls the configured image (if it changed), recreates containers, and
# re-runs migrations. Data volumes are never touched unless you pass
# `--reset-volumes`.
#
# Configuration is read from these environment variables if set (otherwise
# the installer prompts):
#   BASE_URL            Public-facing URL (default: http://localhost:3000)
#   BLOG_NAME           Display name (default: OpenBlog)
#   SIGN_UP_ENABLED     Allow public sign-up (default: false)
#   PORT                Host port to bind the app (default: 3000)
#   PG_PORT             Host port to bind Postgres (default: 5432)
#   IMAGE               Image tag to pull
#                        (default: ghcr.io/iamcoder18/openblog:latest)
#   COMPOSE_FILE        Compose file name (default: docker-compose.prod.yaml)
#   ADMIN_EMAIL         First admin's email (required, no default)
#   ADMIN_NAME          First admin's display name (default: email)
#   ADMIN_PASSWORD      First admin's password (required, no default)
#   COMPOSE_URL         Where to fetch docker-compose.prod.yaml from if not
#                        present locally
#                        (default: latest GitHub release asset URL)
#   INSTALL_DIR         Reserved for future use; not used today
#
# Flags:
#   --non-interactive | -y   Accept all defaults; fail if a required field
#                            (admin email / password) is missing.
#   --reset-volumes          Delete the postgres_data named volume before
#                            bringing the stack up. DESTRUCTIVE.
#   --no-fetch               Don't download docker-compose.prod.yaml if
#                            missing — fail instead.
#   --help | -h              Show usage.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP=openblog

# ─── Color palette (3 colors + reset, OpenCode-style) ────────────────────────
MUTED=$'\033[0;2m'
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
ORANGE=$'\033[38;5;214m'
NC=$'\033[0m'

# ─── Defaults from environment ───────────────────────────────────────────────
# Track which vars the user explicitly set on the command line (or env). When
# a stack is already running, we only substitute values the user explicitly
# chose — falling back to defaults would overwrite the existing deployment's
# carefully-selected ports / URLs.
EXPLICIT_BASE_URL=false
EXPLICIT_BLOG_NAME=false
EXPLICIT_SIGN_UP_ENABLED=false
EXPLICIT_PORT=false
EXPLICIT_PG_PORT=false
EXPLICIT_IMAGE=false
[[ -n "${BASE_URL+x}" ]] && EXPLICIT_BASE_URL=true
[[ -n "${BLOG_NAME+x}" ]] && EXPLICIT_BLOG_NAME=true
[[ -n "${SIGN_UP_ENABLED+x}" ]] && EXPLICIT_SIGN_UP_ENABLED=true
[[ -n "${PORT+x}" ]] && EXPLICIT_PORT=true
[[ -n "${PG_PORT+x}" ]] && EXPLICIT_PG_PORT=true
[[ -n "${IMAGE+x}" ]] && EXPLICIT_IMAGE=true
BASE_URL=${BASE_URL:-}
BLOG_NAME=${BLOG_NAME:-OpenBlog}
SIGN_UP_ENABLED=${SIGN_UP_ENABLED:-false}
PORT=${PORT:-3000}
PG_PORT=${PG_PORT:-5432}
IMAGE=${IMAGE:-ghcr.io/iamcoder18/openblog:latest}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yaml}
ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_NAME=${ADMIN_NAME:-}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}
COMPOSE_URL=${COMPOSE_URL:-https://github.com/IamCoder18/OpenBlog/releases/latest/download/docker-compose.prod.yaml}

# ─── Internal state ─────────────────────────────────────────────────────────
PROJECT=${PROJECT:-$APP}
INTERACTIVE=true
[ ! -t 0 ] && INTERACTIVE=false
RESET_VOLUMES=false
NO_FETCH=false

# ─── Helpers ────────────────────────────────────────────────────────────────
print() {
  local level=$1; shift
  local prefix=""
  case "$level" in
    info)  prefix="${MUTED}▸${NC}" ;;
    ok)    prefix="${GREEN}✓${NC}" ;;
    warn)  prefix="${ORANGE}!${NC}" ;;
    error) prefix="${RED}✗${NC}" ;;
    step)  prefix="${MUTED}──${NC}" ;;
  esac
  printf '  %s %s\n' "$prefix" "$*"
}

fail() {
  printf '\n  %s %s\n\n' "${RED}✗${NC}" "$*"
  printf '  ${RED}Aborted.${NC}\n\n'
  exit 1
}

confirm() {
  local prompt="$1"
  local default="${2:-n}"
  if ! $INTERACTIVE; then
    [ "$default" = "y" ] || [ "$default" = "Y" ] && return 0 || return 1
  fi
  local reply
  printf '  %s?%s %s %s[%s]%s ' "$ORANGE" "$NC" "$prompt" "$MUTED" "$default" "$NC"
  read -r reply
  reply="${reply:-$default}"
  case "${reply,,}" in y|yes) return 0 ;; *) return 1 ;; esac
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  if ! $INTERACTIVE; then
    REPLY="$default"
    return
  fi
  printf '  %s?%s %s %s%s%s\n' "$ORANGE" "$NC" "$prompt" "$MUTED" "$default" "$NC"
  printf '  %s›%s ' "$ORANGE" "$NC"
  read -r REPLY
  REPLY="${REPLY:-$default}"
}

ask_secret() {
  local prompt="$1"
  if ! $INTERACTIVE; then
    fail "Secrets require an interactive TTY. Pass ADMIN_PASSWORD=<value> in the environment."
  fi
  local v1 v2
  printf '  %s?%s %s %s(input hidden)${NC}\n' "$ORANGE" "$NC" "$prompt" "$MUTED"
  printf '  %s›%s ' "$ORANGE" "$NC"
  read -rs v1; printf '\n'
  printf '  %s?%s Confirm password\n' "$ORANGE" "$NC"
  printf '  %s›%s ' "$ORANGE" "$NC"
  read -rs v2; printf '\n'
  [ "$v1" = "$v2" ] || fail "Passwords do not match."
  REPLY="$v1"
}

# ─── Banner ─────────────────────────────────────────────────────────────────
banner() {
  printf '%s' "$MUTED"
  cat <<'EOF'

   ____                  ______ _ _
  / __ \                |  ____(_| |
 | |  | |_ __   ___ _ __| |__   _| | ___   __ _
 | |  | | '_ \ / _ \ '_ \  __| | | |/ _ \ / _` |
 | |__| | |_) |  __/ | | | |___| | | (_) | (_| |
  \____/| .__/ \___|_| |_|_____|_|_|\___/ \__, |
        |_|                                __/ |
        |_|     setup assistant          |___/

EOF
  printf '%s' "$NC"
  printf '\n  %sModern publishing for humans and machines.%s\n\n' "$MUTED" "$NC"
}

# ─── Usage ──────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
OpenBlog Installer

Usage:
  curl -fsSL https://openblog.aaravlabs.com/install | bash
  curl -fsSL https://openblog.aaravlabs.com/install | bash -s -- --non-interactive \\
      ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret

Options:
  --non-interactive | -y    Accept all defaults; fail if required fields
                            (admin email / password) are missing.
  --reset-volumes          Delete the postgres_data named volume before
                            bringing the stack up. DESTRUCTIVE — wipes all
                            posts, users, and settings.
  --no-fetch               Fail if docker-compose.prod.yaml isn't already
                            in the current directory.
  --help | -h              Show this help.

Environment variables (any flag has an env-var equivalent):
  BASE_URL, BLOG_NAME, SIGN_UP_ENABLED, PORT, PG_PORT, IMAGE,
  COMPOSE_FILE, COMPOSE_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD
EOF
}

# ─── Parse flags ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --non-interactive|-y|--yes) INTERACTIVE=false; shift ;;
    --reset-volumes)            RESET_VOLUMES=true; shift ;;
    --no-fetch)                 NO_FETCH=true; shift ;;
    --help|-h)                  usage; exit 0 ;;
    *)                          printf 'Unknown option: %s\n' "$1" >&2; usage; exit 1 ;;
  esac
done

# ─── Welcome ────────────────────────────────────────────────────────────────
banner

# ─── Confirm CWD ───────────────────────────────────────────────────────────
print step "Working directory"
print info "Installing OpenBlog into: ${ORANGE}$(pwd)${NC}"
if ! $INTERACTIVE; then
  print warn "Non-interactive mode: skipping directory confirmation."
else
  if ! confirm "Continue installing into this directory?" "y"; then
    printf '\n  %s↳%s Move to the directory you want OpenBlog in, then re-run.\n\n' "$MUTED" "$NC"
    exit 0
  fi
fi
printf '\n'

# ─── Resolve compose file ──────────────────────────────────────────────────
print step "Compose file"
if [[ -f "$COMPOSE_FILE" ]]; then
  print ok "Found existing ${ORANGE}$COMPOSE_FILE${NC}"
else
  if $NO_FETCH; then
    fail "$COMPOSE_FILE not found and --no-fetch was passed. Download it from the latest release: $COMPOSE_URL"
  fi
  print info "No ${ORANGE}$COMPOSE_FILE${NC} in $(pwd) — fetching from:"
  print info "    ${MUTED}$COMPOSE_URL${NC}"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$COMPOSE_FILE" "$COMPOSE_URL" || fail "Failed to download $COMPOSE_FILE"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$COMPOSE_FILE" "$COMPOSE_URL" || fail "Failed to download $COMPOSE_FILE"
  else
    fail "Neither curl nor wget is available. Install one or pre-place $COMPOSE_FILE."
  fi
  print ok "Downloaded ${ORANGE}$COMPOSE_FILE${NC}"
fi
printf '\n'

# ─── Verify Docker ─────────────────────────────────────────────────────────
print step "Docker prerequisites"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Get it from https://docs.docker.com/get-docker/"
print ok "docker found: ${MUTED}$(docker --version)${NC}"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 plugin not found. Install it (https://docs.docker.com/compose/install/)."
print ok "docker compose plugin found: ${MUTED}$(docker compose version --short)${NC}"
docker info >/dev/null 2>&1 || fail "Docker daemon isn't responding. Start Docker Desktop or: sudo systemctl start docker"
print ok "Docker daemon is running"
printf '\n'

# ─── Detect existing deployment ────────────────────────────────────────────
print step "Existing deployment"
# Look up by container name directly (compose-project-name may differ from
# the directory name when running via `curl | bash` or from a non-default cwd).
# If a running stack is found, adopt its compose project name so we don't
# clash with container_name: declarations on subsequent docker compose calls.
EXISTING_APP=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -x "$APP-app" || true)
EXISTING_DB=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -x "$APP-db" || true)
DETECTED_PROJECT=""
for cn in "$EXISTING_APP" "$EXISTING_DB"; do
  if [[ -n "$cn" ]]; then
    DETECTED_PROJECT=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$cn" 2>/dev/null || true)
    [[ -n "$DETECTED_PROJECT" ]] && break
  fi
done
if [[ -n "$DETECTED_PROJECT" ]]; then
  PROJECT="$DETECTED_PROJECT"
  print info "Adopted existing project name: ${ORANGE}$PROJECT${NC}"
fi
if [[ -n "$EXISTING_APP" || -n "$EXISTING_DB" ]]; then
  RUNNING_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$APP-app" 2>/dev/null || echo "")
  RUNNING_TAG=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$APP-app" 2>/dev/null || echo "")
  if [[ -n "$RUNNING_IMAGE" ]]; then
    print info "Already running:"
    print info "    image:    ${MUTED}$RUNNING_IMAGE${NC}"
    if [[ -n "$RUNNING_TAG" ]]; then
      print info "    version:  ${MUTED}$RUNNING_TAG${NC}"
    fi
  fi
  if [[ "$RUNNING_IMAGE" == "$IMAGE" ]]; then
    print ok "Running image matches configured image. Will re-create containers with new config."
    SKIP_PULL=true
  else
    print info "Configured image (${ORANGE}$IMAGE${NC}) differs from running — will pull + recreate."
    SKIP_PULL=false
  fi
else
  print ok "No existing ${ORANGE}$APP${NC} deployment detected."
  SKIP_PULL=false
fi
printf '\n'

# ─── Collect user configuration ────────────────────────────────────────────
print step "Configuration"
print info "These values are baked into ${ORANGE}$COMPOSE_FILE${NC}."
print info "You can edit them later and re-run this installer to apply changes."
printf '\n'

ask "Public-facing URL the app will be served from" "${BASE_URL:-http://localhost:$PORT}"
BASE_URL="$REPLY"

ask "Blog display name (titles, nav, RSS feed)" "$BLOG_NAME"
BLOG_NAME="$REPLY"

ask "Allow public sign-up at /auth/signup? (true/false)" "$SIGN_UP_ENABLED"
SIGN_UP_ENABLED="$REPLY"

ask "App host port (change if 3000 is taken)" "$PORT"
PORT="$REPLY"

ask "Postgres host port (change if $PG_PORT is taken)" "$PG_PORT"
PG_PORT="$REPLY"

ask "Image to pull" "$IMAGE"
IMAGE="$REPLY"
printf '\n'

# ─── Admin account ─────────────────────────────────────────────────────────
print step "First admin account"
ask "Admin email" "$ADMIN_EMAIL"
ADMIN_EMAIL="$REPLY"
[ -n "$ADMIN_EMAIL" ] || fail "Admin email is required."

ask "Admin display name" "${ADMIN_NAME:-$ADMIN_EMAIL}"
ADMIN_NAME="$REPLY"

if [[ -n "$ADMIN_PASSWORD" ]]; then
  print info "Using ADMIN_PASSWORD from environment (length: ${#ADMIN_PASSWORD})."
elif $INTERACTIVE; then
  ask_secret "Admin password (min 10 chars)"
  ADMIN_PASSWORD="$REPLY"
else
  fail "ADMIN_PASSWORD is required in non-interactive mode."
fi
[ "${#ADMIN_PASSWORD}" -ge 10 ] || fail "Admin password must be at least 10 characters."
printf '\n'

# ─── Write config into the compose file ────────────────────────────────────
print step "Writing configuration"
backup="${COMPOSE_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$COMPOSE_FILE" "$backup"
print info "Backup of previous file: ${MUTED}$backup${NC}"

# Quote any value safely for inline YAML by escaping embedded double-quotes
# and wrapping in double quotes. Values are stored as `KEY: "<value>"`.
yaml_quote() {
  local v="$1"
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf '"%s"' "$v"
}

# Substitutions that respect user overrides. When a stack is already
# running, we only substitute env values the user explicitly passed in
# — re-substituting defaults would clobber a working deployment's settings.
substitute_if_changed() {
  local key="$1"
  local value="$2"
  local current
  current=$(grep -E "^[[:space:]]+${key}:" "$COMPOSE_FILE" | head -n1 | sed -E "s|^[[:space:]]+${key}:[[:space:]]*||" | sed -E 's|^"(.*)"$|\1|')
  if [[ "$current" != "$value" ]]; then
    sed -i -E "s|^([[:space:]]+${key}:[[:space:]]*).*\$|\\1$(yaml_quote "$value")|" "$COMPOSE_FILE"
    print info "Set ${ORANGE}${key}${NC}"
  fi
}

if $EXPLICIT_BASE_URL; then
  substitute_if_changed "BASE_URL" "$BASE_URL"
fi
if $EXPLICIT_BLOG_NAME; then
  substitute_if_changed "BLOG_NAME" "$BLOG_NAME"
fi
if $EXPLICIT_SIGN_UP_ENABLED; then
  sed -i -E "s|^([[:space:]]+SIGN_UP_ENABLED:[[:space:]]*).*\$|\\1\"$SIGN_UP_ENABLED\"|" "$COMPOSE_FILE"
fi

if $EXPLICIT_PORT; then
  sed -i -E "s|\"(-)?[0-9]+:3000\"|\"${PORT}:3000\"|" "$COMPOSE_FILE"
fi
if $EXPLICIT_PG_PORT; then
  sed -i -E "s|\"127\\.0\\.0\\.1:[0-9]+:5432\"|\"127.0.0.1:${PG_PORT}:5432\"|" "$COMPOSE_FILE"
fi

# Generate + substitute secrets. The compose file ships with REPLACE_ME_*
# placeholders in POSTGRES_PASSWORD, DATABASE_URL, and AUTH_SECRET. On a fresh
# install we generate fresh values; on a re-install into an already-running
# stack, we keep whatever's already baked into the compose file (the user can
# edit them in place to rotate if they really want to).
generate_pg=true
generate_auth=true
if [[ -n "$EXISTING_APP" || -n "$EXISTING_DB" ]]; then
  # Stack is already up. If the compose file has REPLACE_ME placeholders, the
  # values baked into the running containers will diverge from what we'd
  # generate — silently rotating them would break login + crash migrations.
  if grep -q "REPLACE_ME_run_openssl_rand_hex_32" "$COMPOSE_FILE"; then
    if $INTERACTIVE; then
      print warn "Compose file has unsubstituted POSTGRES_PASSWORD placeholders."
      print warn "Running stack uses different secrets — generating new ones will"
      print warn "rotate credentials and break login until the existing data volume"
      print warn "is re-initialized (requires ${ORANGE}--reset-volumes${NC})."
      if ! confirm "Generate fresh secrets and reset the data volume?" "n"; then
        print info "Keeping existing secrets. Either:"
        print info "  - restore the existing ${ORANGE}$COMPOSE_FILE${NC} from ${MUTED}$backup${NC}, or"
        print info "  - hand-substitute the REPLACE_ME_* tokens with your existing values."
        exit 1
      fi
    else
      fail "Compose file has unsubstituted POSTGRES_PASSWORD but a stack is already running. Re-run interactively to confirm rotation, or substitute the placeholders manually."
    fi
    if [[ "$RESET_VOLUMES" != "true" ]]; then
      print warn "Auto-enabling --reset-volumes since credentials are being rotated."
      RESET_VOLUMES=true
    fi
  fi
  # If no placeholder, just leave whatever is in the file untouched.
  generate_pg=false
  generate_auth=false
fi

if $generate_pg && grep -q "REPLACE_ME_run_openssl_rand_hex_32" "$COMPOSE_FILE"; then
  PG_PASS=$(openssl rand -hex 32)
  sed -i "s|REPLACE_ME_run_openssl_rand_hex_32|${PG_PASS}|g" "$COMPOSE_FILE"
  print ok "Generated POSTGRES_PASSWORD"
fi
if $generate_auth && grep -q "REPLACE_ME_run_openssl_rand_base64_32" "$COMPOSE_FILE"; then
  AUTH_SEC=$(openssl rand -base64 32)
  sed -i "s|REPLACE_ME_run_openssl_rand_base64_32|${AUTH_SEC}|g" "$COMPOSE_FILE"
  print ok "Generated AUTH_SECRET"
fi
printf '\n'

# ─── Confirm before bringing up ────────────────────────────────────────────
print step "Ready to start"
print info "Compose file:    ${ORANGE}$COMPOSE_FILE${NC}"
print info "Image:           ${ORANGE}$IMAGE${NC}"
print info "Public URL:      ${ORANGE}$BASE_URL${NC}"
print info "App port:        ${ORANGE}$PORT${NC}"
print info "Postgres port:   ${ORANGE}$PG_PORT${NC}"
print info "Admin email:     ${ORANGE}$ADMIN_EMAIL${NC}"
if [[ "$RESET_VOLUMES" == "true" ]]; then
  print warn "--reset-volumes set: existing ${ORANGE}postgres_data${NC} will be DELETED."
fi
printf '\n'

if ! $INTERACTIVE; then
  print info "Non-interactive mode: proceeding."
else
  if ! confirm "Bring up the stack now?" "y"; then
    print info "Cancelled. To start later: docker compose -f $COMPOSE_FILE --project-name $PROJECT up -d"
    exit 0
  fi
fi
printf '\n'

# ─── Up ────────────────────────────────────────────────────────────────────
print step "Starting stack"

if [[ "$RESET_VOLUMES" == "true" ]]; then
  docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" down -v >/dev/null 2>&1 || true
  print warn "Removed existing volumes."
fi

if [[ "$SKIP_PULL" == "true" ]]; then
  print info "Image unchanged — recreating containers for new config."
  # Plain `up -d` lets compose diff desired config vs running; it recreates
  # only the containers whose config changed. Volumes stay intact.
  docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" up -d 2>&1 | tail -n 10
else
  print info "Pulling image (this may take a minute on first run)..."
  docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" pull --ignore-pull-failures 2>&1 | tail -n 5 || true
  print info "Bringing up containers..."
  docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" up -d 2>&1 | tail -n 10
fi
printf '\n'

# ─── Wait for healthy ──────────────────────────────────────────────────────
print step "Waiting for app to respond"
attempt=0
max_attempts=90
until curl -fs -o /dev/null --max-time 3 "${BASE_URL%/}/api/health" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    print error "App didn't respond within $((max_attempts * 2))s."
    print info "Inspect logs:"
    print info "    docker compose -f $COMPOSE_FILE --project-name $PROJECT logs -f app"
    exit 1
  fi
  sleep 2
done
print ok "App is responding at ${ORANGE}${BASE_URL%/}${NC}"
printf '\n'

# ─── Bootstrap admin ───────────────────────────────────────────────────────
print step "Creating admin user"
docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" exec -T app \
  ./node_modules/.bin/tsx scripts/create-admin.ts "$ADMIN_EMAIL" "$ADMIN_NAME" "$ADMIN_PASSWORD" \
  >/dev/null 2>&1 || fail "Admin creation failed. Re-run with --non-interactive false to debug."
print ok "Admin ${ORANGE}$ADMIN_EMAIL${NC} provisioned with role ADMIN"
printf '\n'

# ─── Summary ───────────────────────────────────────────────────────────────
clear 2>/dev/null || true
printf '%s' "$GREEN"
cat <<'EOF'

  ✓  OpenBlog is live

EOF
printf '%s' "$NC"

cat <<EOF
  ${ORANGE}Public URL${NC}       ${BASE_URL%/}
  ${ORANGE}Admin login${NC}      ${ADMIN_EMAIL}
  ${ORANGE}Admin password${NC}   ${ADMIN_PASSWORD}
  ${ORANGE}Compose file${NC}     $(pwd)/${COMPOSE_FILE}
  ${ORANGE}Project${NC}          ${PROJECT}

  ${MUTED}Manage your instance:${NC}
    docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} logs -f app
    docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} down         ${MUTED}# stop (preserves data)${NC}
    docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} down -v      ${MUTED}# stop + DELETE data${NC}

  ${MUTED}Day-to-day URLs:${NC}
    Sign in             ${BASE_URL%/}/auth/login
    Admin dashboard     ${BASE_URL%/}/dashboard
    API keys (agents)   ${BASE_URL%/}/agent/keys

  ${MUTED}Documentation:${NC} https://github.com/IamCoder18/OpenBlog
EOF
printf '\n'
