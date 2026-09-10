import * as dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '@ones-panel/database';
import { authRoutes } from './routes/auth.js';
import { brandingRoutes } from './routes/branding.js';
import { applicationRoutes } from './routes/applications.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { settingsRoutes } from './routes/settings.js';
import { userRoutes } from './routes/users.js';
import { auditRoutes } from './routes/audit.js';
import { performanceRoutes } from './routes/performance.js';
import { alertRoutes } from './routes/alerts.js';
import { healthCheckRoutes } from './routes/healthchecks.js';
import { dockerRoutes } from './routes/docker.js';
import { statusPageRoutes } from './routes/statuspage.js';
import { backupRoutes } from './routes/backups.js';
import { vpsRoutes } from './routes/vps.js';
import { servicesRoutes } from './routes/services.js';
import { analyticsRoutes } from './routes/analytics.js';
import { logsRoutes } from './routes/logs.js';
import { botsRoutes } from './routes/bots.js';
import { minecraftRoutes } from './routes/minecraft.js';
import { campaignRoutes } from './routes/campaigns.js';
import { broadcastRoutes } from './routes/broadcasts.js';
import { embedRoutes } from './routes/embeds.js';
import { discordAnalyticsRoutes } from './routes/discord-analytics.js';
import { rolesRoutes } from './routes/roles.js';
import { terminalRoutes } from './routes/terminal.js';
import { websocketRoutes, startMetricsBroadcast } from './websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Register plugins
app.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret',
  sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

app.register(websocket);

// Auth hook - only for API routes
app.addHook('onRequest', async (request, reply) => {
  // Skip auth for non-API routes (static files, SPA)
  if (!request.url.startsWith('/api')) {
    return;
  }

  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/setup', '/api/health', '/api/branding'];
  if (publicPaths.some(path => request.url.startsWith(path))) {
    return;
  }

  try {
    await request.jwtVerify();
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
    });
    if (user) {
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      };
    }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(brandingRoutes, { prefix: '/api/branding' });
app.register(applicationRoutes, { prefix: '/api/applications' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(settingsRoutes, { prefix: '/api/settings' });
app.register(userRoutes, { prefix: '/api/users' });
app.register(auditRoutes, { prefix: '/api/audit' });
app.register(performanceRoutes, { prefix: '/api/performance' });
app.register(alertRoutes, { prefix: '/api/alerts' });
app.register(healthCheckRoutes, { prefix: '/api/healthchecks' });
app.register(dockerRoutes, { prefix: '/api/docker' });
app.register(statusPageRoutes, { prefix: '/api/statuspage' });
app.register(backupRoutes, { prefix: '/api/backups' });
app.register(vpsRoutes, { prefix: '/api/vps' });
app.register(servicesRoutes, { prefix: '/api/services' });
app.register(analyticsRoutes, { prefix: '/api/analytics' });
app.register(logsRoutes, { prefix: '/api/logs' });
app.register(botsRoutes, { prefix: '/api/bots' });
app.register(minecraftRoutes, { prefix: '/api/minecraft' });
app.register(campaignRoutes, { prefix: '/api/campaigns' });
app.register(broadcastRoutes, { prefix: '/api/broadcasts' });
app.register(embedRoutes, { prefix: '/api/embeds' });
app.register(discordAnalyticsRoutes, { prefix: '/api/discord-analytics' });
app.register(rolesRoutes, { prefix: '/api/roles' });
app.register(terminalRoutes, { prefix: '/api/terminal' });
app.register(websocketRoutes);

// Serve static frontend files
const webDist = path.resolve(__dirname, '../../web/dist');
app.register(fastifyStatic, {
  root: webDist,
  prefix: '/',
  wildcard: false,
});

// SPA fallback - serve index.html for non-API routes
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
    reply.status(404).send({ error: 'Not found' });
  } else {
    reply.sendFile('index.html');
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`API server running on http://${host}:${port}`);

    startMetricsBroadcast(30000);

    setInterval(async () => {
      try {
        const applications = await prisma.application.findMany({
          where: { status: { in: ['RUNNING', 'STOPPED', 'ERROR'] } },
        });

        for (const app of applications) {
          const lastCheck = app.updatedAt?.getTime() || 0;
          const now = Date.now();

          if (now - lastCheck > 60000) {
            // Status will be checked by the adapter when requested
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }, 60000);

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
