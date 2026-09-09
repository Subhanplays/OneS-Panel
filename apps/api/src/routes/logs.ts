import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

export async function logsRoutes(app: FastifyInstance) {
  // Get all logs with pagination and filters
  app.get('/', async (request) => {
    const { limit = 50, offset = 0, serviceId, level, search } = request.query as {
      limit?: number;
      offset?: number;
      serviceId?: string;
      level?: string;
      search?: string;
    };

    const where: any = {};
    if (serviceId) where.serviceId = serviceId;
    if (level) where.level = level;
    if (search) {
      where.message = { contains: search, mode: 'ignore' };
    }

    const [logs, total] = await Promise.all([
      prisma.serviceLog.findMany({
        where,
        include: {
          application: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.serviceLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  });

  // Get logs for specific application
  app.get<{ Params: { id: string } }>('/service/:id', async (request, reply) => {
    const { id } = request.params;
    const { limit = 50, offset = 0, level } = request.query as {
      limit?: number;
      offset?: number;
      level?: string;
    };

    const where: any = { serviceId: id };
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
      prisma.serviceLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.serviceLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  });

  // Get log stats
  app.get('/stats', async () => {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, errors, warnings, info] = await Promise.all([
      prisma.serviceLog.count(),
      prisma.serviceLog.count({ where: { level: 'ERROR', createdAt: { gte: last24h } } }),
      prisma.serviceLog.count({ where: { level: 'WARNING', createdAt: { gte: last24h } } }),
      prisma.serviceLog.count({ where: { level: 'INFO', createdAt: { gte: last24h } } }),
    ]);

    return {
      data: {
        total,
        last24h: {
          errors,
          warnings,
          info,
        },
      },
    };
  });

  // Clear old logs
  app.delete('/clear', async (request) => {
    const { days = 30 } = request.query as { days?: number };
    
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await prisma.serviceLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return { deleted: result.count };
  });
}
