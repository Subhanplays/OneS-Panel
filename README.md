# ONES PANEL

Self-hosted hosting infrastructure management platform.

## Features

- **Dashboard** - Real-time system overview
- **Application Manager** - One-click install/start/stop/restart
- **Branding** - Complete white-label customization
- **User Management** - RBAC with roles and permissions
- **Audit Logs** - Track all actions
- **Background Jobs** - Async task processing
- **Real-time Metrics** - CPU, RAM, Disk, Network monitoring

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Fastify, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Queue**: Redis, BullMQ
- **Container**: Docker, Docker Compose

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-repo/ones-panel.git
cd ones-panel

# Copy environment file
cp .env.example .env

# Generate secrets
sed -i "s/your-super-secret-jwt-key-change-in-production/$(openssl rand -hex 32)/" .env
sed -i "s/your-32-char-encryption-key-here!/$(openssl rand -hex 16)/" .env

# Start services
docker-compose up -d

# Setup database
docker-compose exec api npx prisma db push
docker-compose exec api npx prisma db seed
```

Access at: http://localhost

### Manual Installation

```bash
# Install dependencies
pnpm install

# Setup database
cd packages/database
cp ../../apps/api/.env.example ../../apps/api/.env
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# Build packages
pnpm build

# Start development
pnpm dev
```

## Default Credentials

- **Email**: admin@onespanel.com
- **Password**: admin123

**Important**: Change the default password after first login!

## Project Structure

```
ones-panel/
├── apps/
│   ├── api/          # Fastify backend
│   ├── web/          # React frontend
│   └── worker/       # Background job processor
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── database/     # Prisma schema and migrations
│   └── service-manager/  # Service adapter system
├── docker/           # Docker configurations
├── scripts/          # Utility scripts
├── install.sh        # Production installer
└── docker-compose.yml
```

## Configuration

Environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `ENCRYPTION_KEY` - Key for encrypting secrets
- `PORT` - API server port (default: 3001)
- `CORS_ORIGIN` - Frontend URL for CORS

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (first user only)
- `GET /api/auth/me` - Get current user

### Branding
- `GET /api/branding` - Get branding config
- `PUT /api/branding` - Update branding

### Applications
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get application
- `POST /api/applications/:id/install` - Install
- `POST /api/applications/:id/start` - Start
- `POST /api/applications/:id/stop` - Stop
- `POST /api/applications/:id/restart` - Restart

### Dashboard
- `GET /api/dashboard` - Get dashboard data

### Settings
- `GET /api/settings` - List settings
- `PUT /api/settings/:key` - Update setting

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Audit
- `GET /api/audit` - List audit logs
- `GET /api/audit/stats` - Get statistics

## Development

```bash
# Start all services in development mode
pnpm dev

# Or start individually
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

## License

MIT
