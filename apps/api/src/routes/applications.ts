import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';
import { createAdapter, AdapterType, AdapterConfig } from '@ones-panel/service-manager';

const applicationSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

const adapterInstances = new Map<string, any>();

async function getAdapter(applicationId: string) {
  if (adapterInstances.has(applicationId)) {
    return adapterInstances.get(applicationId);
  }

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return null;

  const config = (app.config as AdapterConfig) || {};
  const adapter = createAdapter(app.type.toLowerCase().replace('_', '-') as AdapterType, {
    installPath: app.installPath || undefined,
    ...config,
  });

  adapterInstances.set(applicationId, adapter);
  return adapter;
}

export async function applicationRoutes(app: FastifyInstance) {
  // Get all applications
  app.get('/', async () => {
    return prisma.application.findMany({
      orderBy: { name: 'asc' },
    });
  });

  // Get marketplace (available apps)
  app.get('/marketplace', async () => {
    const installed = await prisma.application.findMany();
    const installedTypes = installed.map(a => a.type);

    const marketplace = [
      {
        type: 'JTG',
        name: 'JTG',
        description: 'Minecraft server management panel',
        icon: '🎮',
        category: 'Minecraft',
        installed: installedTypes.includes('JTG'),
      },
      {
        type: 'STATUS_PAGE',
        name: 'Status Page',
        description: 'Public status page for your services',
        icon: '📊',
        category: 'Monitoring',
        installed: installedTypes.includes('STATUS_PAGE'),
      },
      {
        type: 'VPS_DEPLOY_BOT',
        name: 'VPS Deploy Bot',
        description: 'Discord bot for VPS deployment and management',
        icon: '🤖',
        category: 'Discord',
        installed: installedTypes.includes('VPS_DEPLOY_BOT'),
      },
      {
        type: 'HOSTING_OPS_BOT',
        name: 'Hosting Operations Bot',
        description: 'Discord bot for hosting operations and community management',
        icon: '🤖',
        category: 'Discord',
        installed: installedTypes.includes('HOSTING_OPS_BOT'),
      },
    ];

    return marketplace;
  });

  // Get single application
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const app_record = await prisma.application.findUnique({
      where: { id },
      include: {
        healthChecks: {
          take: 10,
          orderBy: { checkedAt: 'desc' },
        },
      },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    // Get real-time status
    const adapter = await getAdapter(id);
    let realStatus = app_record.status;
    let metrics = null;

    if (adapter) {
      try {
        realStatus = await adapter.getStatus();
        metrics = await adapter.metrics();
        
        // Update database if status changed
        if (realStatus !== app_record.status) {
          await prisma.application.update({
            where: { id },
            data: { status: realStatus as any },
          });
        }
      } catch (err) {
        console.error('Failed to get adapter status:', err);
      }
    }

    return { ...app_record, status: realStatus, metrics };
  });

  // Update application config
  app.put('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = applicationSchema.parse(request.body);

    const app_record = await prisma.application.findUnique({
      where: { id },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: body as any,
    });

    // Clear cached adapter
    adapterInstances.delete(id);

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'application',
        resourceId: id,
        details: body as any,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return updated;
  });

  // Install application
  app.post('/:id/install', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const app_record = await prisma.application.findUnique({
      where: { id },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    // Update status to installing
    await prisma.application.update({
      where: { id },
      data: { status: 'INSTALLING' },
    });

    // Get adapter and install
    const adapter = await getAdapter(id);
    if (!adapter) {
      await prisma.application.update({
        where: { id },
        data: { status: 'ERROR' },
      });
      return reply.status(500).send({ error: 'Failed to create adapter' });
    }

    try {
      await adapter.install();
      
      await prisma.application.update({
        where: { id },
        data: { 
          status: 'INSTALLED',
          installedAt: new Date(),
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'INSTALL',
          resource: 'application',
          resourceId: id,
          details: { name: app_record.name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return { status: 'INSTALLED', message: 'Installation completed' };
    } catch (err: any) {
      await prisma.application.update({
        where: { id },
        data: { status: 'ERROR' },
      });

      // Log error
      await prisma.serviceLog.create({
        data: {
          serviceId: id,
          level: 'ERROR',
          message: `Installation failed: ${err.message}`,
          metadata: { error: err.stack },
        },
      });

      return reply.status(500).send({ error: 'Installation failed', details: err.message });
    }
  });

  // Start application
  app.post('/:id/start', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const app_record = await prisma.application.findUnique({
      where: { id },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    const adapter = await getAdapter(id);
    if (!adapter) {
      return reply.status(500).send({ error: 'Failed to create adapter' });
    }

    try {
      await adapter.start();
      
      const updated = await prisma.application.update({
        where: { id },
        data: { status: 'RUNNING', lastStartedAt: new Date() },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'START',
          resource: 'application',
          resourceId: id,
          details: { name: app_record.name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to start', details: err.message });
    }
  });

  // Stop application
  app.post('/:id/stop', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const app_record = await prisma.application.findUnique({
      where: { id },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    const adapter = await getAdapter(id);
    if (!adapter) {
      return reply.status(500).send({ error: 'Failed to create adapter' });
    }

    try {
      await adapter.stop();
      
      const updated = await prisma.application.update({
        where: { id },
        data: { status: 'STOPPED', lastStoppedAt: new Date() },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'STOP',
          resource: 'application',
          resourceId: id,
          details: { name: app_record.name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to stop', details: err.message });
    }
  });

  // Restart application
  app.post('/:id/restart', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const app_record = await prisma.application.findUnique({
      where: { id },
    });

    if (!app_record) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    const adapter = await getAdapter(id);
    if (!adapter) {
      return reply.status(500).send({ error: 'Failed to create adapter' });
    }

    try {
      await adapter.restart();
      
      const updated = await prisma.application.update({
        where: { id },
        data: { status: 'RUNNING', lastStartedAt: new Date() },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'RESTART',
          resource: 'application',
          resourceId: id,
          details: { name: app_record.name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to restart', details: err.message });
    }
  });

  // Get application logs
  app.get('/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 100, offset = 0 } = request.query as { limit?: number; offset?: number };

    // Get adapter logs if available
    const adapter = await getAdapter(id);
    let adapterLogs: string[] = [];
    
    if (adapter) {
      try {
        adapterLogs = await adapter.logs(limit);
      } catch {}
    }

    // Get database logs
    const dbLogs = await prisma.serviceLog.findMany({
      where: { serviceId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      adapterLogs,
      dbLogs,
    };
  });

  // Get application metrics
  app.get('/:id/metrics', async (request, reply) => {
    const { id } = request.params as { id: string };

    const adapter = await getAdapter(id);
    let metrics = null;

    if (adapter) {
      try {
        metrics = await adapter.metrics();
      } catch {}
    }

    return metrics;
  });

  // Health check
  app.get('/:id/health', async (request, reply) => {
    const { id } = request.params as { id: string };

    const adapter = await getAdapter(id);
    if (!adapter) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    try {
      const health = await adapter.health();
      
      // Store health check
      await prisma.healthCheck.create({
        data: {
          serviceId: id,
          status: health.status,
          message: health.message,
          responseTime: health.responseTime,
        },
      });

      return health;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Health check failed', details: err.message });
    }
  });
}
