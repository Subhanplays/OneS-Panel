import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { prisma } from '@ones-panel/database';
import { authRoutes } from './routes/auth';
import { brandingRoutes } from './routes/branding';
import { applicationRoutes } from './routes/applications';
import { dashboardRoutes } from './routes/dashboard';
import { settingsRoutes } from './routes/settings';
import { userRoutes } from './routes/users';
import { auditRoutes } from './routes/audit';
import { performanceRoutes } from './routes/performance';
import { alertRoutes } from './routes/alerts';
import { healthCheckRoutes } from './routes/healthchecks';
import { dockerRoutes } from './routes/docker';
import { statusPageRoutes } from './routes/statuspage';
import { backupRoutes } from './routes/backups';
import { vpsRoutes } from './routes/vps';
import { servicesRoutes } from './routes/services';
import { analyticsRoutes } from './routes/analytics';
import { logsRoutes } from './routes/logs';
import { botsRoutes } from './routes/bots';
import { minecraftRoutes } from './routes/minecraft';
import { campaignRoutes } from './routes/campaigns';
import { broadcastRoutes } from './routes/broadcasts';
import { embedRoutes } from './routes/embeds';
import { discordAnalyticsRoutes } from './routes/discord-analytics';
import { roleRoutes } from './routes/roles';
import { terminalRoutes } from './routes/terminal';
import { websocketRoutes, startMetricsBroadcast, broadcastStatus, broadcastAlert } from './websocket';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Register plugins
app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// Decorate request with user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
      permissions: string[];
    };
  }
}

// Auth hook
app.addHook('onRequest', async (request, reply) => {
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/health'];
  if (publicPaths.some(path => request.url.startsWith(path))) {
    return;
  }

  try {
    await request.jwtVerify();
    const user = await prisma.user.findUnique({
      where: { id: request.user?.id },
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
app.register(roleRoutes, { prefix: '/api/roles' });
app.register(terminalRoutes, { prefix: '/api/terminal' });
app.register(websocketRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`API server running on http://${host}:${port}`);

    // Start periodic metrics broadcast
    startMetricsBroadcast(30000);

    // Monitor application status changes
    setInterval(async () => {
      try {
        const applications = await prisma.application.findMany({
          where: { status: { in: ['RUNNING', 'STOPPED', 'ERROR'] } },
        });

        for (const app of applications) {
          const lastCheck = app.updatedAt?.getTime() || 0;
          const now = Date.now();
          
          // Check every 60 seconds
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
