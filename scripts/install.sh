#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenBlog — interactive installer
# ─────────────────────────────────────────────────────────────────────────────
# Builds the OpenBlog image, brings up Postgres + app, and bootstraps an
# admin. Works on macOS, Linux, WSL, and Git Bash on Windows.
#
# Modes:
#   ./scripts/install.sh                           # interactive (image-pull mode)
#   ./scripts/install.sh --local-build             # build from local source
#   ./scripts/install.sh --non-interactive         # accept defaults
#   ./scripts/install.sh --help
#   ./scripts/install.sh --image openblog:dev --port 3300 --admin-email …
#
# Flags:
#   --non-interactive | -y           Accept all defaults; don't prompt.
#   --base-url URL                   Public-facing URL (default: http://localhost:3000)
#   --blog-name NAME                 Display name (default: OpenBlog)
#   --sign-up-enabled BOOL           Allow public sign-up (default: false)
#   --admin-email EMAIL              Admin login email
#   --admin-name  NAME               Admin display name
#   --admin-password PASS            Admin password
#   --port INT                       Host port to bind the app to (default: 3000)
#   --postgres-port INT              Host port to bind Postgres to (default: 5432)
#   --image IMAGE                    Image tag to pull (default: ghcr.io/iamcoder18/openblog:latest)
#   --local-build                    Build from local Dockerfile instead of pulling
#   --project-name NAME              Compose project name (default: openblog)
#   --help | -h                      Show this help
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── TTY / non-interactive detection ───────────────────────────────────────
INTERACTIVE=true
[[ ! -t 0 ]] && INTERACTIVE=false

for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y|--yes) INTERACTIVE=false ;;
  esac
done

# ─── Colors ────────────────────────────────────────────────────────────────
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  B=$'\033[1m'; DIM=$'\033[2m'
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'
  BLD=$'\033[34m'; M=$'\033[35m'; C=$'\033[36m'; X=$'\033[0m'
else
  B=""; DIM=""; R=""; G=""; Y=""; BLD=""; M=""; C=""; X=""
fi

# ─── Helpers ───────────────────────────────────────────────────────────────
hr() { printf '%s%s%s\n' "$DIM" "────────────────────────────────────────────────────────" "$X"; }
box() {
  local title="$1"; shift
  printf '\n'
  printf '%s%s╭%s╮%s\n' "$B$C" "─" "─────────────────────────────────────────────" "$X"
  printf '%s%s│%s  %s%s%s\n' "$B$C" "│" "$X" "$B$title" "$X"
  printf '%s%s╰%s╯%s\n' "$B$C" "─" "─────────────────────────────────────────────" "$X"
}
info()  { printf '  %s▸%s %s\n' "$BLD$C" "$X" "$*"; }
ok()    { printf '  %s✓%s %s\n' "$G" "$X" "$*"; }
warn()  { printf '  %s!%s %s\n' "$Y" "$X" "$*"; }
fail()  { printf '  %s✗%s %s\n' "$R" "$X" "$*"; printf '\n%sAborted.%s\n' "$R$B" "$X"; exit 1; }
ask() {
  local prompt="$1"; local default="${2:-}"
  if [[ -n "$default" ]]; then
    printf '  %s?%s %s %s%s%s\n' "$B$M" "$X" "$prompt" "$DIM" "$default" "$X"
  else
    printf '  %s?%s %s\n' "$B$M" "$X" "$prompt"
  fi
  printf '  %s›%s ' "$B$M" "$X"
  if [[ ! -t 0 ]]; then REPLY="$default"; printf '%s\n' "${REPLY:-(empty)}"
  else read -r REPLY; REPLY="${REPLY:-$default}"; fi
}
ask_secret() {
  local prompt="$1"
  printf '  %s?%s %s %s(input hidden)%s\n' "$B$M" "$X" "$prompt" "$DIM" "$X"
  printf '  %s›%s ' "$B$M" "$X"
  if [[ ! -t 0 ]]; then fail "Secrets require an interactive TTY. Pass --admin-password."; fi
  local v1 v2
  read -rs REPLY_FIRST; printf '\n'
  printf '  %s?%s Confirm password\n' "$B$M" "$X"
  printf '  %s›%s ' "$B$M" "$X"
  read -rs REPLY2; printf '\n'
  [[ "$REPLY_FIRST" != "$REPLY2" ]] && fail "Passwords do not match."
  REPLY="$REPLY_FIRST"
  echo "$REPLY"
}
confirm() {
  local prompt="$1"; local default="${2:-n}"
  printf '  %s?%s %s %s[%s]%s\n' "$B$M" "$X" "$prompt" "$DIM" "$default" "$X"
  printf '  %s›%s ' "$B$M" "$X"
  local reply; read -r reply; reply="${reply:-$default}"
  case "${reply,,}" in y|yes) return 0 ;; *) return 1 ;; esac
}
spinner() {
  local pid=$1; local msg="$2"
  local f=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  [[ "${LANG:-}${LC_ALL:-}" != *UTF-8* && "${TERM:-}" != *"utf"* ]] && f=("|" "/" "-" "\\")
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  %s %s %s  ' "${f[i % ${#f[@]}]}" "$msg" "$DIM"
    sleep 0.1; i=$((i+1))
  done
  printf '\r%80s\r'
}

# ─── Help ──────────────────────────────────────────────────────────────────
print_help() { sed -n '2,38p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }
[[ "${1:-}" =~ ^(-h|--help)$ ]] && print_help

# ─── Parse flags ────────────────────────────────────────────────────────────
BASE_URL=""; BLOG_NAME=""; SIGN_UP_ENABLED=""
ADMIN_EMAIL=""; ADMIN_NAME=""; ADMIN_PASSWORD=""
PORT=3000; PG_PORT=5432; PROJECT="openblog"
LOCAL_BUILD=false
IMAGE="ghcr.io/iamcoder18/openblog:latest"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --non-interactive|-y|--yes) INTERACTIVE=false; shift ;;
    --base-url)         BASE_URL="$2"; shift 2 ;;
    --blog-name)        BLOG_NAME="$2"; shift 2 ;;
    --sign-up-enabled)  SIGN_UP_ENABLED="$2"; shift 2 ;;
    --admin-email)      ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-name)       ADMIN_NAME="$2"; shift 2 ;;
    --admin-password)   ADMIN_PASSWORD="$2"; shift 2 ;;
    --port)             PORT="$2"; shift 2 ;;
    --postgres-port)    PG_PORT="$2"; shift 2 ;;
    --image)            IMAGE="$2"; shift 2 ;;
    --local-build)      LOCAL_BUILD=true; shift ;;
    --project-name)     PROJECT="$2"; shift 2 ;;
    --help|-h)          print_help ;;
    *) printf 'Unknown flag: %s\n' "$1" >&2; exit 1 ;;
  esac
done

# ─── Compose file selection ─────────────────────────────────────────────────
# The script works in two contexts:
#   (A) Cloned repo:        cwd contains `docker-compose.local.yaml` or `Dockerfile`.
#   (B) Standalone deploy:  cwd contains `docker-compose.prod.yaml` (wget'd).
# We don't force-cd into any specific project root.

# Per-deployment compose file name. The production file ships as
# docker-compose.prod.yaml (wget'd). Local dev uses docker-compose.local.yaml.
PROD_COMPOSE="docker-compose.prod.yaml"
LOCAL_COMPOSE="docker-compose.local.yaml"

if $LOCAL_BUILD; then
  [[ -f Dockerfile ]] || fail "--local-build requires the source repo (Dockerfile not found in $(pwd))."
  if [[ -f "$LOCAL_COMPOSE" ]]; then
    COMPOSE_FILE="$LOCAL_COMPOSE"
  elif [[ -f "$PROD_COMPOSE" ]]; then
    COMPOSE_FILE="$PROD_COMPOSE"
  else
    fail "--local-build needs $LOCAL_COMPOSE or $PROD_COMPOSE in $(pwd)."
  fi
else
  if [[ -f "$PROD_COMPOSE" ]]; then
    COMPOSE_FILE="$PROD_COMPOSE"
  elif [[ -f "$LOCAL_COMPOSE" ]]; then
    warn "$PROD_COMPOSE not found — falling back to $LOCAL_COMPOSE."
    COMPOSE_FILE="$LOCAL_COMPOSE"
    LOCAL_BUILD=true
  else
    fail "No compose file found in $(pwd). Download $PROD_COMPOSE from https://github.com/IamCoder18/OpenBlog, or clone the repo."
  fi
fi

info "Using compose file: ${B}${COMPOSE_FILE}${X}"

# ─── Banner ─────────────────────────────────────────────────────────────────
clear 2>/dev/null || true

printf '%s' "$B$C"
cat <<'EOF'

   ____                  ______ _ _               
  / __ \                |  ____(_) |              
 | |  | |_ __   ___ _ __| |__   _| | ___   __ _   
 | |  | | '_ \ / _ \ '_ \  __| | | |/ _ \ / _` |  
 | |__| | |_) |  __/ | | | |___| | | (_) | (_| |  
  \____/| .__/ \___|_| |_|_____|_|_|\___/ \__, |  
        | |                                __/ |  
        |_|     setup assistant          |___/   

EOF
printf '%s' "$X"

printf '%s%s%s\n' "$DIM" "  Modern publishing for humans and machines." "$X"
printf '\n'

box "What this does"
info "Verify Docker is installed and the daemon is running"
info "Generate ${B}AUTH_SECRET${X} and ${B}POSTGRES_PASSWORD${X}; substitute them into ${B}${COMPOSE_FILE}${X}"
if $LOCAL_BUILD; then
  info "Build the OpenBlog image from source (~3–5 min on first run)"
else
  info "Pull the OpenBlog image: ${B}${IMAGE}${X}"
fi
info "Start Postgres + the Next.js app, run migrations"
info "Create your first admin user"
hr
printf '\n'

# ─── Require Docker ─────────────────────────────────────────────────────────
hr
printf '\n'

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker Desktop or docker-ce from https://docs.docker.com/get-docker/"
ok "docker found: ${DIM}$(docker --version)${X}"

if docker compose version >/dev/null 2>&1; then
  ok "docker compose plugin found: ${DIM}$(docker compose version --short)${X}"
else
  fail "Docker Compose v2 plugin not found. Install the compose plugin (https://docs.docker.com/compose/install/)."
fi

if ! docker info >/dev/null 2>&1; then
  printf '\n'
  warn "Docker is installed but the daemon isn't responding."
  warn "Start Docker Desktop, or run: ${B}sudo systemctl start docker${X}"
  exit 1
fi
ok "Docker daemon is running"
printf '\n'

# ─── Port conflict check ───────────────────────────────────────────────────
if [[ -t 0 ]]; then
  warn "Using host port $PORT for the app and $PG_PORT for Postgres."
  if ss -ltn 2>/dev/null | grep -qE ":(((${PORT})|(${PG_PORT})))[[:space:]]"; then
    warn "Port $PORT or $PG_PORT appears to already be in use on this host."
    warn "Re-run with --port <free-port> or --postgres-port <free-port>."
  fi
  printf '\n'
fi

# ─── Collect configuration ─────────────────────────────────────────────────
if $INTERACTIVE; then
  box "Configuration"
  if [[ -f .env ]]; then
    warn "An .env file already exists."
    if ! confirm "Overwrite it?" "n"; then
      info "Keeping existing .env."
      SKIP_ENV_PROMPT=true
    fi
  fi
  printf '\n'

  if [[ "${SKIP_ENV_PROMPT:-}" != "true" ]]; then
    ask "Public-facing URL the app will be served from" "http://localhost:$PORT"
    BASE_URL="${REPLY:-http://localhost:$PORT}"
    ask "Blog display name (shown in titles, nav, RSS feed)" "OpenBlog"
    BLOG_NAME="${REPLY:-OpenBlog}"
    ask "Allow public sign-up? (true/false)" "false"
    SIGN_UP_ENABLED="${REPLY:-false}"

    # Port + image overrides (only when interactively running)
    echo
    ask "App host port (change if 3000 is taken)" "$PORT"
    PORT="${REPLY:-$PORT}"
    ask "Postgres host port (change if $PG_PORT is taken)" "$PG_PORT"
    PG_PORT="${REPLY:-$PG_PORT}"
    if ! $LOCAL_BUILD; then
      ask "Image to pull" "$IMAGE"
      IMAGE="${REPLY:-$IMAGE}"
    fi
  fi
  printf '\n'

  box "Admin account"
  ask "Admin email" ""
  ADMIN_EMAIL="$REPLY"
  [[ -z "$ADMIN_EMAIL" ]] && fail "Admin email is required."
  ask "Admin display name" "$ADMIN_EMAIL"
  ADMIN_NAME="${REPLY:-$ADMIN_EMAIL}"
  echo
  ask_secret "Admin password (min 8 chars)"
  ADMIN_PASSWORD="$REPLY"
  [[ ${#ADMIN_PASSWORD} -lt 8 ]] && fail "Admin password must be at least 8 characters."
  printf '\n'
else
  : "${BASE_URL:=http://localhost:$PORT}"
  : "${BLOG_NAME:=OpenBlog}"
  : "${SIGN_UP_ENABLED:=false}"
  [[ -z "$ADMIN_EMAIL" ]]    && fail "--admin-email is required in non-interactive mode"
  [[ -z "$ADMIN_PASSWORD" ]] && fail "--admin-password is required in non-interactive mode"
fi

# ─── Write .env ───────────────────────────────────────────────────────────
NEED_ENV=true
if [[ -f .env ]]; then
  if [[ "${SKIP_ENV_PROMPT:-}" == "true" ]]; then
    NEED_ENV=false
  fi
fi

if $NEED_ENV; then
  GENERATED_SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 48 /dev/urandom | base64)"
  GENERATED_POSTGRES_PASSWORD="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  cat > .env <<EOF
AUTH_SECRET="${GENERATED_SECRET}"
POSTGRES_PASSWORD="${GENERATED_POSTGRES_PASSWORD}"
BASE_URL="${BASE_URL}"
BLOG_NAME="${BLOG_NAME}"
SIGN_UP_ENABLED="${SIGN_UP_ENABLED}"
APP_HOST_PORT=${PORT}
POSTGRES_HOST_PORT=${PG_PORT}
OPENBLOG_IMAGE=${IMAGE}
EOF
  ok ".env written"
fi

# ─── Up (build if local) ──────────────────────────────────────────────────
box "Starting stack"

UP_ARGS=(-f "$COMPOSE_FILE" --project-name "$PROJECT" up -d)
if $LOCAL_BUILD; then
  UP_ARGS+=(--build)
fi

docker compose "${UP_ARGS[@]}" 2>&1 | tail -n 20 || fail "Failed to start the stack."
ok "Containers created"

# ─── Wait for healthy ──────────────────────────────────────────────────────
printf '  %s▸%s Waiting for the app to respond on http://localhost:%s\n' "$BLD$C" "$X" "$PORT"
for i in {1..90}; do
  if curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:${PORT}/" 2>/dev/null | grep -q "^2"; then
    ok "App is live"
    break
  fi
  if [[ $i -eq 90 ]]; then
    warn "The app didn't respond within 90 s. Check:"
    printf "      ${DIM}docker compose -f %s --project-name %s logs -f app${X}\n" "$COMPOSE_FILE" "$PROJECT"
    exit 1
  fi
  sleep 1
done

# ─── Create admin ──────────────────────────────────────────────────────────
box "Creating admin user"
docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" exec -T app \
  ./node_modules/.bin/tsx scripts/create-admin.ts "$ADMIN_EMAIL" "$ADMIN_NAME" "$ADMIN_PASSWORD" \
  >/dev/null || fail "Admin creation failed."
ok "Admin ${B}${ADMIN_EMAIL}${X} provisioned with role ${B}ADMIN${X}"
printf '\n'

# ─── Summary ───────────────────────────────────────────────────────────────
clear 2>/dev/null || true
printf '%s' "$B$G"
cat <<'EOF'
╭─────────────────────────────────────────────╮
│                                             │
│   ✅  OpenBlog is live                      │
│                                             │
╰─────────────────────────────────────────────╯
EOF
printf '%s' "$X"

printf '\n  %s🌐%s  %s%s%s\n' "$B" "$X" "$C$B" "http://localhost:${PORT}" "$X"
printf '  %s👤%s  %s\n' "$B" "$X" "$ADMIN_EMAIL"
printf '  %s🔑%s  %s\n' "$B" "$X" "$ADMIN_PASSWORD"
printf '\n'

cat <<EOF
  Mode:
    Image:    ${IMAGE}
    Compose:  ${COMPOSE_FILE}
    Project:  ${PROJECT}

  Manage your instance:
    docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} logs -f app
    docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} down -v        # stop + delete data

  Day-to-day:
    Sign in                http://localhost:${PORT}/auth/login
    Admin dashboard        http://localhost:${PORT}/dashboard
    API keys (agents)      http://localhost:${PORT}/agent/keys

  More info: docs/api.md (HTTP API) · CONTRIBUTING.md (dev workflow)
EOF
printf '\n'
