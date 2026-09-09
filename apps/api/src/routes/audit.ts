import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

export async function auditRoutes(app: FastifyInstance) {
  // Get audit logs
  app.get('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { 
      limit = 50, 
      offset = 0, 
      resource, 
      action,
      userId,
      startDate,
      endDate 
    } = request.query as {
      limit?: number;
      offset?: number;
      resource?: string;
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    };

    const where: any = {};
    if (resource) where.resource = resource;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  });

  // Get audit log stats
  app.get('/stats', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const [todayCount, weekCount, monthCount, total] = await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: thisWeek } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: thisMonth } },
      }),
      prisma.auditLog.count(),
    ]);

    // Get top actions
    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    });

    // Get top resources
    const topResources = await prisma.auditLog.groupBy({
      by: ['resource'],
      _count: true,
      orderBy: { _count: { resource: 'desc' } },
      take: 10,
    });

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      total,
      topActions: topActions.map(a => ({ action: a.action, count: a._count })),
      topResources: topResources.map(r => ({ resource: r.resource, count: r._count })),
    };
  });
}
