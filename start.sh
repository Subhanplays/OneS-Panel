#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

log() { echo -e "${GREEN}[OneS-Panel]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

pkill -f "node apps/api/dist" 2>/dev/null || true
pkill -f "node apps/worker/dist" 2>/dev/null || true
pkill -f "npx serve" 2>/dev/null || true
pkill -f "serve apps/web" 2>/dev/null || true
# Kill anything on port 8080
ss -tlnp 'sport = :8080' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | xargs kill 2>/dev/null || true
sleep 1

if ! command -v node &>/dev/null; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null
fi

if ! command -v pnpm &>/dev/null; then
    log "Installing pnpm..."
    npm install -g pnpm 2>/dev/null
fi

export PATH="$(npm config get prefix 2>/dev/null)/bin:$HOME/.local/share/pnpm:$PATH"

log "Node: $(node --version)"
log "pnpm: $(pnpm --version)"

if ! command -v psql &>/dev/null; then
    log "Installing PostgreSQL..."
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib 2>/dev/null
fi

pg_isready -q 2>/dev/null || {
    log "Starting PostgreSQL..."
    pg_ctlcluster 14 main start 2>/dev/null || \
    pg_ctlcluster 15 main start 2>/dev/null || \
    pg_ctlcluster 16 main start 2>/dev/null || \
    su - postgres -c "pg_ctl -D /var/lib/postgresql/data start" 2>/dev/null || \
    warn "PostgreSQL may need manual start"
}
sleep 2

if ! command -v redis-cli &>/dev/null; then
    log "Installing Redis..."
    apt-get install -y redis-server 2>/dev/null
fi

redis-cli ping 2>/dev/null | grep -q PONG || {
    log "Starting Redis..."
    redis-server --daemonize yes 2>/dev/null || \
    warn "Redis may need manual start"
}

log "Setting up database..."
sudo -u postgres psql -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ones_panel OWNER onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER onespanel WITH SUPERUSER;" 2>/dev/null || true

log "Installing pnpm dependencies..."
pnpm install --no-frozen-lockfile 2>/dev/null || pnpm install

# ---- Build in dependency order ----
log "Cleaning old builds..."
rm -rf apps/api/dist apps/worker/dist apps/web/dist packages/shared/dist packages/service-manager/dist packages/database/dist

log "Building shared..."
pnpm --filter @ones-panel/shared build

log "Generating Prisma client..."
pnpm --filter @ones-panel/database generate

log "Building database..."
pnpm --filter @ones-panel/database build

log "Building service-manager..."
pnpm --filter @ones-panel/service-manager build

log "Pushing database schema..."
cd "$DIR/packages/database" && npx prisma db push --skip-generate 2>/dev/null && cd "$DIR"

log "Seeding database..."
cd "$DIR" && set -a; source "$DIR/.env" 2>/dev/null; set +a; cd "$DIR/packages/database" && node dist/seed.js || warn "Seed skipped"

log "Building API..."
pnpm --filter @ones-panel/api build

log "Building Worker..."
pnpm --filter @ones-panel/worker build

log "Building Web..."
pnpm --filter @ones-panel/web build

mkdir -p "$DIR/logs"
> "$DIR/logs/api.log"
> "$DIR/logs/worker.log"

log "Starting API on port 8080 (serves frontend + API)..."
cd "$DIR"
NODE_ENV=production node apps/api/dist/index.js > "$DIR/logs/api.log" 2>&1 &
echo $! > "$DIR/logs/api.pid"
sleep 3

if kill -0 $(cat "$DIR/logs/api.pid") 2>/dev/null; then
    log "API started OK"
else
    err "API failed! Last 20 lines:"
    tail -20 "$DIR/logs/api.log"
fi

log "Starting Worker..."
NODE_ENV=production node apps/worker/dist/index.js > "$DIR/logs/worker.log" 2>&1 &
echo $! > "$DIR/logs/worker.pid"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}       OneS-Panel is running!              ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Web + API:${NC} http://localhost:8080"
echo -e "${GREEN}Default:${NC}   admin@onespanel.com / admin123"
echo ""
echo -e "${YELLOW}Logs:${NC}     $DIR/logs/"
echo -e "${YELLOW}Stop:${NC}     pkill -f 'node apps/'"
