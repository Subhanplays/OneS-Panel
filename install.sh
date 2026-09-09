#!/bin/bash

set -e

# ============================================================
# OneS-Panel Installer
# Safe dependency installer for Debian/Ubuntu and RHEL-based OS
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

log() {
    echo -e "${GREEN}[OneS-Panel]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

die() {
    error "$1"
    exit 1
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ------------------------------------------------------------
# Banner
# ------------------------------------------------------------

print_banner() {
    echo -e "${BLUE}"
    echo "  ╦╔╦╗╔═╗╔═╗╦═╗"
    echo "  ║║║║╠═╝║╣ ╠╦╝"
    echo "  ╩╩ ╩╩  ╚═╝╩╚═"
    echo -e "${NC}"

    echo -e "  ${YELLOW}Ones Panel Installer${NC}"
    echo ""
}

# ------------------------------------------------------------
# Root check
# ------------------------------------------------------------

check_root() {
    if [ "$EUID" -ne 0 ]; then
        die "Please run this installer as root."
    fi
}

# ------------------------------------------------------------
# OS detection
# ------------------------------------------------------------

detect_os() {
    if [ -f /etc/debian_version ]; then
        OS="debian"
        PKG_MANAGER="apt-get"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
        PKG_MANAGER="yum"
    else
        die "Unsupported operating system."
    fi

    log "Detected OS: ${OS}"
}

# ------------------------------------------------------------
# Detect container / overlay environment
# ------------------------------------------------------------

detect_environment() {
    IS_CONTAINER="false"

    if [ -f /.dockerenv ]; then
        IS_CONTAINER="true"
    fi

    if grep -qaE 'docker|containerd|kubepods|lxc|overlay' /proc/1/cgroup 2>/dev/null; then
        IS_CONTAINER="true"
    fi

    if command_exists findmnt; then
        if findmnt -T /usr/bin/git 2>/dev/null | grep -q overlay; then
            GIT_OVERLAY="true"
        else
            GIT_OVERLAY="false"
        fi
    else
        GIT_OVERLAY="false"
    fi

    if [ "$IS_CONTAINER" = "true" ]; then
        info "Container/overlay environment detected."
    fi

    if [ "$GIT_OVERLAY" = "true" ]; then
        info "Provider-mounted Git detected."
    fi
}

# ------------------------------------------------------------
# Safe Git handling
# ------------------------------------------------------------

setup_git() {
    if command_exists git; then
        GIT_PATH="$(command -v git)"
        GIT_VERSION="$(git --version 2>/dev/null || true)"

        log "Git already available: ${GIT_VERSION}"
        info "Git path: ${GIT_PATH}"

        if [ "$GIT_OVERLAY" = "true" ]; then
            info "Skipping Git package installation/upgrade because Git is provider-mounted."
        fi

        return 0
    fi

    warn "Git is not installed."

    if [ "$OS" = "debian" ]; then
        apt-get install -y git
    else
        yum install -y git
    fi

    if ! command_exists git; then
        die "Git installation failed."
    fi

    log "Git installed successfully: $(git --version)"
}

# ------------------------------------------------------------
# Basic dependencies
# ------------------------------------------------------------

install_basic_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    if [ "$OS" = "debian" ]; then

        apt-get update

        # IMPORTANT:
        # Do NOT include git here.
        #
        # Some hosting/container environments mount Git separately
        # (for example /usr/bin/git -> /opt/git/bin/git).
        #
        # Asking apt/dpkg to upgrade Git in those environments causes:
        #
        #   Invalid cross-device link
        #   Device or resource busy
        #
        apt-get install -y curl build-essential ca-certificates

    elif [ "$OS" = "redhat" ]; then

        yum install -y curl gcc-c++ make ca-certificates

    fi

    setup_git

    echo -e "${GREEN}Dependencies installed${NC}"
}

# ------------------------------------------------------------
# Node.js
# ------------------------------------------------------------

install_node() {

    if command_exists node; then
        log "Node.js already installed: $(node --version)"
        return 0
    fi

    echo -e "${YELLOW}Installing Node.js 20...${NC}"

    if [ "$OS" = "debian" ]; then

        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs

    else

        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs

    fi

    if ! command_exists node; then
        die "Node.js installation failed."
    fi

    log "Node.js installed: $(node --version)"
}

# ------------------------------------------------------------
# npm
# ------------------------------------------------------------

check_npm() {

    if ! command_exists npm; then
        die "npm was not installed with Node.js."
    fi

    log "npm version: $(npm --version)"
}

# ------------------------------------------------------------
# pnpm
# ------------------------------------------------------------

install_pnpm() {

    if command_exists pnpm; then
        log "pnpm already installed: $(pnpm --version)"
        return 0
    fi

    echo -e "${YELLOW}Installing pnpm...${NC}"

    npm install -g pnpm

    if ! command_exists pnpm; then
        die "pnpm installation failed."
    fi

    log "pnpm installed: $(pnpm --version)"
}

# ------------------------------------------------------------
# Docker
# ------------------------------------------------------------

install_docker() {

    if command_exists docker; then
        log "Docker already installed: $(docker --version)"
        return 0
    fi

    echo -e "${YELLOW}Installing Docker...${NC}"

    if [ "$OS" = "debian" ]; then

        curl -fsSL https://get.docker.com | sh

    else

        curl -fsSL https://get.docker.com | sh

    fi

    if ! command_exists docker; then
        die "Docker installation failed."
    fi

    log "Docker installed: $(docker --version)"
}

# ------------------------------------------------------------
# Docker Compose
# ------------------------------------------------------------

install_docker_compose() {

    if docker compose version >/dev/null 2>&1; then
        log "Docker Compose plugin already installed."
        return 0
    fi

    if command_exists docker-compose; then
        log "Docker Compose already installed: $(docker-compose --version)"
        return 0
    fi

    echo -e "${YELLOW}Installing Docker Compose...${NC}"

    COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"

    curl -fL "$COMPOSE_URL" -o /usr/local/bin/docker-compose

    chmod +x /usr/local/bin/docker-compose

    if ! command_exists docker-compose; then
        die "Docker Compose installation failed."
    fi

    log "Docker Compose installed: $(docker-compose --version)"
}

# ------------------------------------------------------------
# PostgreSQL
# ------------------------------------------------------------

setup_postgresql() {

    echo -e "${YELLOW}Setting up PostgreSQL...${NC}"

    if ! command_exists psql; then

        if [ "$OS" = "debian" ]; then

            apt-get install -y postgresql postgresql-contrib

        else

            yum install -y postgresql-server postgresql-contrib

            if command_exists postgresql-setup; then
                postgresql-setup --initdb || true
            fi

        fi

    else
        log "PostgreSQL already installed."
    fi

    if command_exists systemctl; then

        systemctl enable postgresql 2>/dev/null || true
        systemctl start postgresql 2>/dev/null || true

    else

        warn "systemctl is unavailable in this environment."
        warn "PostgreSQL service must be started by the host/container runtime."

    fi

    if command_exists psql; then

        sudo -u postgres psql \
            -c "CREATE USER onespanel WITH PASSWORD 'onespanel_secret';" \
            2>/dev/null || true

        sudo -u postgres psql \
            -c "CREATE DATABASE ones_panel OWNER onespanel;" \
            2>/dev/null || true

        sudo -u postgres psql \
            -c "GRANT ALL PRIVILEGES ON DATABASE ones_panel TO onespanel;" \
            2>/dev/null || true

    fi

    echo -e "${GREEN}PostgreSQL configured${NC}"
}

# ------------------------------------------------------------
# Redis
# ------------------------------------------------------------

setup_redis() {

    echo -e "${YELLOW}Setting up Redis...${NC}"

    if ! command_exists redis-cli; then

        if [ "$OS" = "debian" ]; then
            apt-get install -y redis-server
        else
            yum install -y redis
        fi

    else
        log "Redis already installed."
    fi

    if command_exists systemctl; then

        systemctl enable redis-server 2>/dev/null || \
        systemctl enable redis 2>/dev/null || true

        systemctl start redis-server 2>/dev/null || \
        systemctl start redis 2>/dev/null || true

    else

        warn "systemctl unavailable. Redis must be managed by the container runtime."

    fi

    echo -e "${GREEN}Redis configured${NC}"
}

# ------------------------------------------------------------
# Application dependencies
# ------------------------------------------------------------

install_application_dependencies() {

    if [ ! -f package.json ]; then
        warn "package.json not found in ${CURRENT_DIR}."
        return 0
    fi

    echo -e "${YELLOW}Installing application dependencies...${NC}"

    cd "$CURRENT_DIR"

    if [ -f pnpm-lock.yaml ]; then

        pnpm install --frozen-lockfile

    else

        pnpm install

    fi

    echo -e "${GREEN}Application dependencies installed${NC}"
}

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

main() {

    print_banner

    check_root

    detect_os

    detect_environment

    install_basic_dependencies

    install_node

    check_npm

    install_pnpm

    install_docker

    install_docker_compose

    setup_postgresql

    setup_redis

    install_application_dependencies

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}       OneS-Panel installation ready        ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""

    echo -e "${CYAN}Environment:${NC} ${OS}"

    if command_exists git; then
        echo -e "${CYAN}Git:${NC} $(git --version)"
    fi

    if command_exists node; then
        echo -e "${CYAN}Node.js:${NC} $(node --version)"
    fi

    if command_exists pnpm; then
        echo -e "${CYAN}pnpm:${NC} $(pnpm --version)"
    fi

    if command_exists docker; then
        echo -e "${CYAN}Docker:${NC} $(docker --version)"
    fi

    echo ""
    echo -e "${GREEN}Dependencies completed successfully.${NC}"
}

main "$@"
