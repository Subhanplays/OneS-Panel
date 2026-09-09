import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const healthCheckConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['http', 'tcp', 'process', 'docker']),
  target: z.string(),
  port: z.number().optional(),
  interval: z.number().optional().default(60),
  timeout: z.number().optional().default(5),
  enabled: z.boolean().optional().default(true),
});

export async function healthCheckRoutes(app: FastifyInstance) {
  // Get all health checks
  app.get('/', async () => {
    const checks = await prisma.setting.findMany({
      where: { key: { startsWith: 'healthcheck.' } },
    });

    return checks.map(c => ({
      id: c.key.replace('healthcheck.', ''),
      ...JSON.parse(c.value),
    }));
  });

  // Create health check
  app.post('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = healthCheckConfigSchema.parse(request.body);
    const id = `hc_${Date.now()}`;

    await prisma.setting.create({
      data: {
        key: `healthcheck.${id}`,
        value: JSON.stringify(body),
        category: 'healthchecks',
      },
    });

    return { id, ...body };
  });

  // Update health check
  app.put('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = healthCheckConfigSchema.parse(request.body);

    await prisma.setting.update({
      where: { key: `healthcheck.${id}` },
      data: { value: JSON.stringify(body) },
    });

    return { id, ...body };
  });

  // Delete health check
  app.delete('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    await prisma.setting.delete({
      where: { key: `healthcheck.${id}` },
    });

    return { success: true };
  });

  // Run health check
  app.post('/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };

    const setting = await prisma.setting.findUnique({
      where: { key: `healthcheck.${id}` },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Health check not found' });
    }

    const config = JSON.parse(setting.value);
    const startTime = Date.now();

    try {
      let status = 'UNKNOWN';
      let message = '';

      switch (config.type) {
        case 'http':
          try {
            const response = await fetch(config.target, {
              signal: AbortSignal.timeout((config.timeout || 5) * 1000),
            });
            status = response.ok ? 'HEALTHY' : 'CRITICAL';
            message = `HTTP ${response.status}`;
          } catch (err: any) {
            status = 'CRITICAL';
            message = err.message || 'Connection failed';
          }
          break;

        case 'tcp':
          try {
            await execAsync(
              `timeout ${config.timeout || 5} bash -c "echo >/dev/tcp/${config.target}/${config.port}"`,
              { timeout: (config.timeout || 5) * 1000 }
            );
            status = 'HEALTHY';
            message = 'Port open';
          } catch {
            status = 'CRITICAL';
            message = 'Port closed or timeout';
          }
          break;

        case 'process':
          try {
            const { stdout } = await execAsync(`pgrep -f "${config.target}"`);
            status = stdout.trim() ? 'HEALTHY' : 'CRITICAL';
            message = stdout.trim() ? 'Process running' : 'Process not found';
          } catch {
            status = 'CRITICAL';
            message = 'Process not found';
          }
          break;

        case 'docker':
          try {
            const { stdout } = await execAsync(`docker inspect ${config.target} --format='{{.State.Status}}'`);
            const dockerStatus = stdout.trim();
            status = dockerStatus === 'running' ? 'HEALTHY' : 'CRITICAL';
            message = `Docker: ${dockerStatus}`;
          } catch {
            status = 'CRITICAL';
            message = 'Container not found';
          }
          break;
      }

      const responseTime = Date.now() - startTime;

      // Store result
      await prisma.healthCheck.create({
        data: {
          serviceId: id,
          status,
          message,
          responseTime,
        },
      });

      return { status, message, responseTime };
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      
      await prisma.healthCheck.create({
        data: {
          serviceId: id,
          status: 'UNKNOWN',
          message: err.message || 'Check failed',
          responseTime,
        },
      });

      return { status: 'UNKNOWN', message: err.message, responseTime };
    }
  });

  // Get health check history
  app.get('/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 100 } = request.query as { limit?: number };

    const history = await prisma.healthCheck.findMany({
      where: { serviceId: id },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });

    return history;
  });

  // Run all health checks
  app.post('/run-all', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const checks = await prisma.setting.findMany({
      where: { key: { startsWith: 'healthcheck.' } },
    });

    const results = [];

    for (const check of checks) {
      const config = JSON.parse(check.value);
      if (!config.enabled) continue;

      const id = check.key.replace('healthcheck.', '');
      const startTime = Date.now();

      try {
        let status = 'UNKNOWN';
        let message = '';

        switch (config.type) {
          case 'http':
            try {
              const response = await fetch(config.target, {
                signal: AbortSignal.timeout((config.timeout || 5) * 1000),
              });
              status = response.ok ? 'HEALTHY' : 'CRITICAL';
              message = `HTTP ${response.status}`;
            } catch (err: any) {
              status = 'CRITICAL';
              message = err.message || 'Connection failed';
            }
            break;

          case 'tcp':
            try {
              await execAsync(
                `timeout ${config.timeout || 5} bash -c "echo >/dev/tcp/${config.target}/${config.port}"`,
                { timeout: (config.timeout || 5) * 1000 }
              );
              status = 'HEALTHY';
              message = 'Port open';
            } catch {
              status = 'CRITICAL';
              message = 'Port closed or timeout';
            }
            break;

          case 'process':
            try {
              const { stdout } = await execAsync(`pgrep -f "${config.target}"`);
              status = stdout.trim() ? 'HEALTHY' : 'CRITICAL';
              message = stdout.trim() ? 'Process running' : 'Process not found';
            } catch {
              status = 'CRITICAL';
              message = 'Process not found';
            }
            break;
        }

        const responseTime = Date.now() - startTime;

        await prisma.healthCheck.create({
          data: {
            serviceId: id,
            status,
            message,
            responseTime,
          },
        });

        results.push({ id, status, message, responseTime });
      } catch (err: any) {
        results.push({ id, status: 'UNKNOWN', message: err.message });
      }
    }

    return results;
  });
}
