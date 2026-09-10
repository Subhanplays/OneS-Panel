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

# Stop old instances
pkill -f "node apps/api/dist" 2>/dev/null || true
pkill -f "node apps/worker/dist" 2>/dev/null || true
pkill -f "serve apps/web/dist" 2>/dev/null || true
sleep 1

# ---- Install Node.js if missing ----
if ! command -v node &>/dev/null; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null
fi

# ---- Install pnpm if missing ----
if ! command -v pnpm &>/dev/null; then
    log "Installing pnpm..."
    npm install -g pnpm 2>/dev/null
fi

export PATH="$(npm config get prefix 2>/dev/null)/bin:$HOME/.local/share/pnpm:$PATH"

log "Node: $(node --version)"
log "pnpm: $(pnpm --version)"

# ---- Install PostgreSQL if missing ----
if ! command -v psql &>/dev/null; then
    log "Installing PostgreSQL..."
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib 2>/dev/null
fi

# Start PostgreSQL without systemd
pg_isready -q 2>/dev/null || {
    log "Starting PostgreSQL..."
    pg_ctlcluster 14 main start 2>/dev/null || \
    pg_ctlcluster 15 main start 2>/dev/null || \
    pg_ctlcluster 16 main start 2>/dev/null || \
    su - postgres -c "pg_ctl -D /var/lib/postgresql/data start" 2>/dev/null || \
    warn "PostgreSQL may need manual start"
}
sleep 2

# ---- Install Redis if missing ----
if ! command -v redis-cli &>/dev/null; then
    log "Installing Redis..."
    apt-get install -y redis-server 2>/dev/null
fi

redis-cli ping 2>/dev/null | grep -q PONG || {
    log "Starting Redis..."
    redis-server --daemonize yes 2>/dev/null || \
    warn "Redis may need manual start"
}

# ---- Setup database ----
log "Setting up database..."
sudo -u postgres psql -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ones_panel OWNER onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER onespanel WITH SUPERUSER;" 2>/dev/null || true

# ---- Install dependencies ----
log "Installing pnpm dependencies..."
pnpm install --no-frozen-lockfile 2>/dev/null || pnpm install

# ---- Build ----
log "Cleaning old builds..."
rm -rf apps/api/dist apps/worker/dist apps/web/dist packages/shared/dist packages/service-manager/dist

log "Building shared package..."
pnpm --filter @ones-panel/shared build

log "Building service-manager..."
rm -rf packages/service-manager/dist
pnpm --filter @ones-panel/service-manager build

log "Generating Prisma client..."
pnpm --filter @ones-panel/database generate

log "Pushing database schema..."
cd "$DIR/packages/database" && npx prisma db push --skip-generate 2>/dev/null && cd "$DIR"

log "Seeding database..."
cd "$DIR/packages/database" && npx ts-node src/seed.ts && cd "$DIR"

log "Building API..."
pnpm --filter @ones-panel/api build

log "Building Worker..."
pnpm --filter @ones-panel/worker build

log "Building Web..."
pnpm --filter @ones-panel/web build

# ---- Create logs ----
mkdir -p "$DIR/logs"

# ---- Start services ----
log "Starting API on port 3001..."
cd "$DIR"
NODE_ENV=production node apps/api/dist/index.js > "$DIR/logs/api.log" 2>&1 &
echo $! > "$DIR/logs/api.pid"
sleep 3

if kill -0 $(cat "$DIR/logs/api.pid") 2>/dev/null; then
    log "API started OK"
else
    err "API failed! Last 10 lines:"
    tail -10 "$DIR/logs/api.log"
fi

log "Starting Worker..."
NODE_ENV=production node apps/worker/dist/index.js > "$DIR/logs/worker.log" 2>&1 &
echo $! > "$DIR/logs/worker.pid"

log "Starting Web on port 8080..."
npx serve apps/web/dist -l 8080 -s > "$DIR/logs/web.log" 2>&1 &
echo $! > "$DIR/logs/web.pid"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}       OneS-Panel is running!              ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Web:${NC}      http://localhost:8080"
echo -e "${GREEN}API:${NC}      http://localhost:3001"
echo -e "${GREEN}Default:${NC}  admin@onespanel.com / admin123"
echo ""
echo -e "${YELLOW}Logs:${NC}     $DIR/logs/"
echo -e "${YELLOW}Stop:${NC}     pkill -f 'node apps/'"
