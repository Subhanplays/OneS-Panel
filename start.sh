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

log "Starting OneS-Panel..."

# Stop old instances
pkill -f "node apps/api/dist" 2>/dev/null || true
pkill -f "node apps/worker/dist" 2>/dev/null || true
pkill -f "node apps/web" 2>/dev/null || true

# Start PostgreSQL
if command -v systemctl &>/dev/null; then
    systemctl start postgresql 2>/dev/null || true
    systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
else
    service postgresql start 2>/dev/null || true
    service redis-server start 2>/dev/null || service redis start 2>/dev/null || true
fi

sleep 2

# Setup database
log "Setting up database..."
sudo -u postgres psql -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ones_panel OWNER onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER onespanel WITH SUPERUSER;" 2>/dev/null || true

# Build apps
log "Building shared package..."
cd packages/shared && pnpm build && cd ../..

log "Generating Prisma client..."
cd packages/database && pnpm generate && cd ../..

log "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --force-reset 2>/dev/null || true

log "Seeding database..."
npx prisma db seed 2>/dev/null || true

log "Building API..."
cd apps/api && pnpm build && cd ../..

log "Building Worker..."
cd apps/worker && pnpm build && cd ../..

log "Building Web..."
cd apps/web && pnpm build && cd ../..

# Create logs directory
mkdir -p "$DIR/logs"

# Start API
log "Starting API on port 3001..."
cd "$DIR"
NODE_ENV=production node apps/api/dist/index.js > "$DIR/logs/api.log" 2>&1 &
echo $! > "$DIR/logs/api.pid"

sleep 2

# Start Worker
log "Starting Worker..."
NODE_ENV=production node apps/worker/dist/index.js > "$DIR/logs/worker.log" 2>&1 &
echo $! > "$DIR/logs/worker.pid"

# Serve web with a simple static server
log "Starting Web on port 8080..."
if command -v npx &>/dev/null; then
    npx serve apps/web/dist -l 8080 -s > "$DIR/logs/web.log" 2>&1 &
    echo $! > "$DIR/logs/web.pid"
fi

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
