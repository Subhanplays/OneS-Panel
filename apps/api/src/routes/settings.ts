import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const settingSchema = z.object({
  value: z.string(),
});

const bulkSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
});

export async function settingsRoutes(app: FastifyInstance) {
  // Get all settings
  app.get('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    // Group by category
    const grouped: Record<string, Record<string, string>> = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      grouped[setting.category][setting.key] = setting.value;
    }

    return grouped;
  });

  // Get setting by key
  app.get('/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Setting not found' });
    }

    return setting;
  });

  // Update setting
  app.put('/:key', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { key } = request.params as { key: string };
    const body = settingSchema.parse(request.body);

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: body.value },
      create: { key, value: body.value },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'setting',
        resourceId: key,
        details: { key, value: body.value },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return setting;
  });

  // Bulk update settings
  app.put('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = bulkSettingsSchema.parse(request.body);

    for (const { key, value } of body.settings) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'BULK_UPDATE',
        resource: 'settings',
        resourceId: 'bulk',
        details: { count: body.settings.length },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { success: true, updated: body.settings.length };
  });
}
