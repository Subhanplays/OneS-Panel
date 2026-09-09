import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ones-panel/database';
import { VPSDeployBotAdapter, VPSDeployBotConfig } from '@ones-panel/service-manager';

interface CreateVPSBody {
  memory: number;
  cpu: number;
  disk: number;
  ownerId: string;
  osImage?: string;
  useCustomImage?: boolean;
}

interface VPSParams {
  id: string;
}

interface TransferVPSBody {
  newOwnerId: string;
}

// Helper to create adapter from settings
async function getVPSAdapter(): Promise<VPSDeployBotAdapter> {
  const settings = await prisma.setting.findMany();
  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  return new VPSDeployBotAdapter({
    installPath: settingsMap['vps_deploy.installPath'] || '/opt/ones-panel/services/vps-deploy-bot',
    token: settingsMap['vps_deploy.token'],
    guildId: settingsMap['vps_deploy.guildId'],
    watermark: settingsMap['vps_deploy.watermark'] || 'VPS Service',
    welcomeMessage: settingsMap['vps_deploy.welcomeMessage'] || 'Welcome!',
    hostnamePrefix: settingsMap['vps_deploy.hostnamePrefix'] || 'vps',
    dockerImagePrefix: settingsMap['vps_deploy.dockerImagePrefix'] || 'panel',
    maxVpsPerUser: parseInt(settingsMap['vps_deploy.maxVpsPerUser'] || '3'),
    defaultOsImage: settingsMap['vps_deploy.defaultOsImage'] || 'ubuntu:22.04',
    dockerNetwork: settingsMap['vps_deploy.dockerNetwork'] || 'bridge',
    maxContainers: parseInt(settingsMap['vps_deploy.maxContainers'] || '100'),
  });
}

// Helper to log audit
async function logAudit(
  userId: string | undefined,
  action: string,
  resourceId: string,
  details: Record<string, unknown>,
  request: FastifyRequest
) {
  await prisma.auditLog.create({
    data: {
      userId: userId || 'system',
      action,
      resource: 'vps',
      resourceId,
      details,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    },
  });
}

export async function vpsRoutes(app: FastifyInstance) {
  // List all VPS instances
  app.get('/', async (request, reply) => {
    try {
      const adapter = await getVPSAdapter();
      const instances = await adapter.listVPS();
      return { data: instances };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to list VPS instances' });
    }
  });

  // Get VPS stats (must be before /:id to avoid route conflict)
  app.get('/stats', async (request, reply) => {
    try {
      const adapter = await getVPSAdapter();
      const stats = await adapter.getVPSStats();
      return { data: stats };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to get VPS stats' });
    }
  });

  // Get VPS instance by ID
  app.get<{ Params: VPSParams }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      const instance = await adapter.getVPS(id);
      if (!instance) {
        return reply.status(404).send({ error: 'VPS not found' });
      }
      return { data: instance };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to get VPS instance' });
    }
  });

  // Create new VPS instance
  app.post<{ Body: CreateVPSBody }>('/', async (request, reply) => {
    try {
      const { memory, cpu, disk, ownerId, osImage, useCustomImage } = request.body;

      if (!memory || !cpu || !disk || !ownerId) {
        return reply.status(400).send({ error: 'Memory, CPU, disk, and ownerId are required' });
      }

      if (memory < 1 || memory > 512) {
        return reply.status(400).send({ error: 'Memory must be between 1GB and 512GB' });
      }

      if (cpu < 1 || cpu > 32) {
        return reply.status(400).send({ error: 'CPU cores must be between 1 and 32' });
      }

      if (disk < 10 || disk > 1000) {
        return reply.status(400).send({ error: 'Disk space must be between 10GB and 1000GB' });
      }

      const adapter = await getVPSAdapter();
      const instance = await adapter.createVPS({ memory, cpu, disk, ownerId, osImage, useCustomImage });

      await logAudit(request.user?.id, 'create', instance.vpsId, { memory, cpu, disk, ownerId }, request);

      return { data: instance };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to create VPS' });
    }
  });

  // Start VPS
  app.post<{ Params: VPSParams }>('/:id/start', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.startVPS(id);
      await logAudit(request.user?.id, 'start', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to start VPS' });
    }
  });

  // Stop VPS
  app.post<{ Params: VPSParams }>('/:id/stop', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.stopVPS(id);
      await logAudit(request.user?.id, 'stop', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to stop VPS' });
    }
  });

  // Restart VPS
  app.post<{ Params: VPSParams }>('/:id/restart', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.restartVPS(id);
      await logAudit(request.user?.id, 'restart', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to restart VPS' });
    }
  });

  // Delete VPS
  app.delete<{ Params: VPSParams }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.deleteVPS(id);
      await logAudit(request.user?.id, 'delete', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete VPS' });
    }
  });

  // Suspend VPS
  app.post<{ Params: VPSParams }>('/:id/suspend', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.suspendVPS(id);
      await logAudit(request.user?.id, 'suspend', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to suspend VPS' });
    }
  });

  // Unsuspend VPS
  app.post<{ Params: VPSParams }>('/:id/unsuspend', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      await adapter.unsuspendVPS(id);
      await logAudit(request.user?.id, 'unsuspend', id, {}, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to unsuspend VPS' });
    }
  });

  // Transfer VPS
  app.post<{ Params: VPSParams; Body: TransferVPSBody }>('/:id/transfer', async (request, reply) => {
    try {
      const { id } = request.params;
      const { newOwnerId } = request.body;

      if (!newOwnerId) {
        return reply.status(400).send({ error: 'New owner ID is required' });
      }

      const adapter = await getVPSAdapter();
      await adapter.transferVPS(id, newOwnerId);
      await logAudit(request.user?.id, 'transfer', id, { newOwnerId }, request);
      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to transfer VPS' });
    }
  });

  // Change password
  app.post<{ Params: { id: string } }>('/:id/password', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      const newPassword = await adapter.changePassword(id);
      await logAudit(request.user?.id, 'change_password', id, {}, request);
      return { data: { password: newPassword } };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to change password' });
    }
  });

  // Get VPS metrics
  app.get<{ Params: VPSParams }>('/:id/metrics', async (request, reply) => {
    try {
      const { id } = request.params;
      const adapter = await getVPSAdapter();
      const metrics = await adapter.getVPSMetrics(id);
      return { data: metrics };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to get VPS metrics' });
    }
  });
}
