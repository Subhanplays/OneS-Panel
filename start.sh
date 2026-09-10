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

export PATH="$DIR/node_modules/.bin:$HOME/.local/share/pnpm:$HOME/.local/share/corepack:$PATH:/usr/local/bin"

# Ensure pnpm is available
if ! command -v pnpm &>/dev/null; then
    if command -v npm &>/dev/null; then
        npm install -g pnpm
    fi
fi

log "Starting OneS-Panel..."

# Stop old instances
pkill -f "node apps/api/dist" 2>/dev/null || true
pkill -f "node apps/worker/dist" 2>/dev/null || true
pkill -f "serve apps/web/dist" 2>/dev/null || true

# Start PostgreSQL
if command -v systemctl &>/dev/null && systemctl is-active postgresql &>/dev/null 2>&1; then
    true
elif command -v service &>/dev/null; then
    service postgresql start 2>/dev/null || true
    service redis-server start 2>/dev/null || service redis start 2>/dev/null || true
fi

sleep 1

# Check if postgres is running
if ! pg_isready -q 2>/dev/null; then
    warn "PostgreSQL is not running. Please start it manually."
fi

# Setup database
log "Setting up database..."
sudo -u postgres psql -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ones_panel OWNER onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER onespanel WITH SUPERUSER;" 2>/dev/null || true

# Build shared
log "Building shared package..."
pnpm --filter @ones-panel/shared build

# Generate Prisma
log "Generating Prisma client..."
pnpm --filter @ones-panel/database generate

# Push schema to database
log "Pushing database schema..."
cd packages/database && npx prisma db push --skip-generate && cd ../..

# Seed database
log "Seeding database..."
cd packages/database && npx ts-node src/seed.ts && cd ../..

# Build API
log "Building API..."
pnpm --filter @ones-panel/api build

# Build Worker
log "Building Worker..."
pnpm --filter @ones-panel/worker build

# Build Web
log "Building Web..."
pnpm --filter @ones-panel/web build

# Create logs directory
mkdir -p "$DIR/logs"

# Start API
log "Starting API on port 3001..."
cd "$DIR"
NODE_ENV=production node apps/api/dist/index.js > "$DIR/logs/api.log" 2>&1 &
echo $! > "$DIR/logs/api.pid"
sleep 3

# Check if API started
if kill -0 $(cat "$DIR/logs/api.pid") 2>/dev/null; then
    log "API started successfully"
else
    warn "API failed to start. Check logs/api.log"
    cat "$DIR/logs/api.log" | tail -20
fi

# Start Worker
log "Starting Worker..."
NODE_ENV=production node apps/worker/dist/index.js > "$DIR/logs/worker.log" 2>&1 &
echo $! > "$DIR/logs/worker.pid"

# Serve web
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
