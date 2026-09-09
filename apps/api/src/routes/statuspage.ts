import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance']).optional().default('operational'),
  url: z.string().url().optional(),
});

const incidentSchema = z.object({
  title: z.string(),
  message: z.string(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  serviceId: z.string().optional(),
});

const maintenanceSchema = z.object({
  title: z.string(),
  message: z.string(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  scheduledAt: z.string().datetime(),
  serviceId: z.string().optional(),
});

export async function statusPageRoutes(app: FastifyInstance) {
  // Get public status (no auth required)
  app.get('/public', async () => {
    const services = await prisma.setting.findMany({
      where: { key: { startsWith: 'statuspage.service.' } },
    });

    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const maintenance = await prisma.maintenance.findMany({
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    const serviceList = services.map(s => ({
      id: s.key.replace('statuspage.service.', ''),
      ...JSON.parse(s.value),
    }));

    // Calculate overall status
    const statuses = serviceList.map(s => s.status);
    let overallStatus = 'operational';
    if (statuses.includes('major_outage')) overallStatus = 'major_outage';
    else if (statuses.includes('partial_outage')) overallStatus = 'partial_outage';
    else if (statuses.includes('degraded')) overallStatus = 'degraded';
    else if (statuses.includes('maintenance')) overallStatus = 'maintenance';

    return {
      services: serviceList,
      incidents,
      maintenance,
      overallStatus,
    };
  });

  // Get all services (admin)
  app.get('/services', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const services = await prisma.setting.findMany({
      where: { key: { startsWith: 'statuspage.service.' } },
    });

    return services.map(s => ({
      id: s.key.replace('statuspage.service.', ''),
      ...JSON.parse(s.value),
    }));
  });

  // Create service
  app.post('/services', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = serviceSchema.parse(request.body);
    const id = `svc_${Date.now()}`;

    await prisma.setting.create({
      data: {
        key: `statuspage.service.${id}`,
        value: JSON.stringify({ ...body, createdAt: new Date().toISOString() }),
        category: 'statuspage',
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'status_service',
        resourceId: id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { id, ...body };
  });

  // Update service
  app.put('/services/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = serviceSchema.partial().parse(request.body);

    const existing = await prisma.setting.findUnique({
      where: { key: `statuspage.service.${id}` },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    const current = JSON.parse(existing.value);
    await prisma.setting.update({
      where: { key: `statuspage.service.${id}` },
      data: { value: JSON.stringify({ ...current, ...body }) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'status_service',
        resourceId: id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { id, ...current, ...body };
  });

  // Delete service
  app.delete('/services/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    await prisma.setting.delete({
      where: { key: `statuspage.service.${id}` },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'status_service',
        resourceId: id,
        details: {},
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { success: true };
  });

  // Incidents
  app.get('/incidents', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return incidents;
  });

  app.post('/incidents', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = incidentSchema.parse(request.body);

    const incident = await prisma.incident.create({
      data: body,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'incident',
        resourceId: incident.id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return incident;
  });

  app.put('/incidents/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = incidentSchema.partial().parse(request.body);

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...body,
        ...(body.status === 'resolved' ? { resolvedAt: new Date() } : {}),
      },
    });

    return incident;
  });

  // Maintenance
  app.get('/maintenance', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const maintenance = await prisma.maintenance.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    });

    return maintenance;
  });

  app.post('/maintenance', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = maintenanceSchema.parse(request.body);

    const maintenance = await prisma.maintenance.create({
      data: {
        ...body,
        scheduledAt: new Date(body.scheduledAt),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'maintenance',
        resourceId: maintenance.id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return maintenance;
  });

  app.put('/maintenance/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = maintenanceSchema.partial().parse(request.body);

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: {
        ...body,
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
      },
    });

    return maintenance;
  });
}
