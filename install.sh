#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
    echo -e "${BLUE}"
    echo "  ╦╔╦╗╔═╗╔═╗╦═╗"
    echo "  ║║║║╠═╝║╣ ╠╦╝"
    echo "  ╩╩ ╩╩  ╚═╝╩╚═"
    echo -e "${NC}"
    echo -e "  ${YELLOW}Ones Panel Installer${NC}"
    echo ""
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Please run as root${NC}"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/debian_version ]; then
        OS="debian"
        PKG_MANAGER="apt-get"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
        PKG_MANAGER="yum"
    else
        echo -e "${RED}Unsupported OS${NC}"
        exit 1
    fi
    echo -e "${GREEN}Detected OS: ${OS}${NC}"
}

install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    if [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y curl git build-essential
    elif [ "$OS" = "redhat" ]; then
        yum install -y curl git gcc-c++ make
    fi
    
    # Install Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Installing Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        if [ "$OS" = "debian" ]; then
            apt-get install -y nodejs
        else
            yum install -y nodejs
        fi
    fi
    
    # Install pnpm
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}Installing pnpm...${NC}"
        npm install -g pnpm
    fi
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Installing Docker...${NC}"
        curl -fsSL https://get.docker.com | sh
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}Installing Docker Compose...${NC}"
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    echo -e "${GREEN}Dependencies installed${NC}"
}

setup_postgresql() {
    echo -e "${YELLOW}Setting up PostgreSQL...${NC}"
    
    if ! command -v psql &> /dev/null; then
        if [ "$OS" = "debian" ]; then
            apt-get install -y postgresql postgresql-contrib
        else
            yum install -y postgresql-server postgresql-contrib
            postgresql-setup initdb
        fi
    fi
    
    systemctl enable postgresql
    systemctl start postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" || true
    sudo -u postgres psql -c "CREATE DATABASE ones_panel OWNER onespanel;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" || true
    
    echo -e "${GREEN}PostgreSQL configured${NC}"
}

setup_redis() {
    echo -e "${YELLOW}Setting up Redis...${NC}"
    
    if ! command -v redis-cli &> /dev/null; then
        if [ "$OS" = "debian" ]; then
            apt-get install -y redis-server
        else
            yum install -y redis
        fi
    fi
    
    systemctl enable redis
    systemctl start redis
    
    echo -e "${GREEN}Redis configured${NC}"
}

install_ones_panel() {
    echo -e "${YELLOW}Installing Ones Panel...${NC}"
    
    INSTALL_DIR="/opt/ones-panel"
    
    # Clone repository
    if [ ! -d "$INSTALL_DIR" ]; then
        git clone https://github.com/your-repo/ones-panel.git "$INSTALL_DIR"
    fi
    
    cd "$INSTALL_DIR"
    
    # Install dependencies
    pnpm install
    
    # Setup environment
    if [ ! -f .env ]; then
        cp .env.example .env
        
        # Generate random secrets
        JWT_SECRET=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 16)
        
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        sed -i "s/your-32-char-encryption-key-here!/$ENCRYPTION_KEY/" .env
        sed -i "s/postgresql:\/\/postgres:postgres@localhost:5432\/ones_panel/postgresql:\/\/onespanel:onespanel_secret@localhost:5432\/ones_panel/" .env
    fi
    
    # Setup database
    cd packages/database
    npx prisma generate
    npx prisma db push
    cd ../..
    
    # Build packages
    pnpm build
    
    echo -e "${GREEN}Ones Panel installed${NC}"
}

create_systemd_services() {
    echo -e "${YELLOW}Creating systemd services...${NC}"
    
    INSTALL_DIR="/opt/ones-panel"
    
    # API service
    cat > /etc/systemd/system/ones-panel-api.service << EOF
[Unit]
Description=Ones Panel API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Worker service
    cat > /etc/systemd/system/ones-panel-worker.service << EOF
[Unit]
Description=Ones Panel Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/apps/worker
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ones-panel-api
    systemctl enable ones-panel-worker
    
    echo -e "${GREEN}Systemd services created${NC}"
}

start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    systemctl start ones-panel-api
    systemctl start ones-panel-worker
    
    echo -e "${GREEN}Services started${NC}"
}

print_success() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Ones Panel installed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  Access: ${BLUE}http://$(hostname -I | awk '{print $1}'):3001${NC}"
    echo ""
    echo -e "  Default credentials:"
    echo -e "  Email: ${YELLOW}admin@onespanel.com${NC}"
    echo -e "  Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "  ${RED}Important: Change the default password after first login!${NC}"
    echo ""
}

# Main
print_banner
check_root
detect_os
install_dependencies
setup_postgresql
setup_redis
install_ones_panel
create_systemd_services
start_services
print_success
