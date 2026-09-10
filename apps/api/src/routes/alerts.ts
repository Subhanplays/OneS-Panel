import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const createAlertRuleSchema = z.object({
  name: z.string(),
  metric: z.enum(['cpu', 'ram', 'disk', 'network']),
  condition: z.enum(['gt', 'lt', 'eq']),
  threshold: z.number(),
  duration: z.number().optional().default(60),
  enabled: z.boolean().optional().default(true),
  notify: z.array(z.enum(['panel', 'discord', 'email'])).optional().default(['panel']),
});

export async function alertRoutes(app: FastifyInstance) {
  // Get all alerts
  app.get('/', async (request, reply) => {
    const { 
      limit = 50, 
      offset = 0, 
      severity, 
      acknowledged,
      startDate,
      endDate 
    } = request.query as {
      limit?: number;
      offset?: number;
      severity?: string;
      acknowledged?: string;
      startDate?: string;
      endDate?: string;
    };

    const where: any = {};
    if (severity) where.severity = severity;
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.alert.count({ where }),
    ]);

    return { alerts, total, limit, offset, hasMore: offset + limit < total };
  });

  // Get alert stats
  app.get('/stats', async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [todayCount, weekCount, unacknowledged, bySeverity] = await Promise.all([
      prisma.alert.count({ where: { createdAt: { gte: today } } }),
      prisma.alert.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.alert.count({ where: { acknowledged: false } }),
      prisma.alert.groupBy({
        by: ['severity'],
        _count: true,
        where: { createdAt: { gte: thisWeek } },
      }),
    ]);

    return {
      today: todayCount,
      thisWeek: weekCount,
      unacknowledged,
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
    };
  });

  // Acknowledge alert
  app.put('/:id/acknowledge', async (request, reply) => {
    if (!request.user) {
      return reply.status(200).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as { id: string };

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: request.user.id,
      },
    });

    return updated;
  });

  // Delete alert
  app.delete('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    await prisma.alert.delete({ where: { id } });

    return { success: true };
  });

  // Clear all acknowledged alerts
  app.delete('/clear/acknowledged', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const result = await prisma.alert.deleteMany({
      where: { acknowledged: true },
    });

    return { deleted: result.count };
  });

  // Alert rules management
  app.get('/rules', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const rules = await prisma.setting.findMany({
      where: { key: { startsWith: 'alert.rule.' } },
    });

    return rules.map(r => ({
      id: r.key.replace('alert.rule.', ''),
      ...JSON.parse(r.value),
    }));
  });

  app.post('/rules', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = createAlertRuleSchema.parse(request.body);
    const id = `rule_${Date.now()}`;

    await prisma.setting.create({
      data: {
        key: `alert.rule.${id}`,
        value: JSON.stringify(body),
        category: 'alerts',
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'alert_rule',
        resourceId: id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { id, ...body };
  });

  app.put('/rules/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = createAlertRuleSchema.parse(request.body);

    await prisma.setting.update({
      where: { key: `alert.rule.${id}` },
      data: { value: JSON.stringify(body) },
    });

    return { id, ...body };
  });

  app.delete('/rules/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    await prisma.setting.delete({
      where: { key: `alert.rule.${id}` },
    });

    return { success: true };
  });
}
