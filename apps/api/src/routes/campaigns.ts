import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1),
  message: z.string().min(1),
  embedJson: z.any().optional(),
  targetType: z.string().default('channel'),
  targetId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  botId: z.string().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

export async function campaignRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const query = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25')));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count(),
    ]);

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  app.get('/stats', async () => {
    const [total, sent, failed, draft, scheduled, sending] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'sent' } }),
      prisma.campaign.count({ where: { status: 'failed' } }),
      prisma.campaign.count({ where: { status: 'draft' } }),
      prisma.campaign.count({ where: { status: 'scheduled' } }),
      prisma.campaign.count({ where: { status: 'sending' } }),
    ]);

    return {
      data: {
        total,
        sent,
        failed,
        draft,
        scheduled,
        sending,
      },
    };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }
    return { data: campaign };
  });

  app.post('/', async (request, reply) => {
    const parsed = createCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    if (parsed.data.botId) {
      const bot = await prisma.discordBot.findUnique({ where: { id: parsed.data.botId } });
      if (!bot) {
        return reply.status(404).send({ error: 'Bot not found' });
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.data.name,
        message: parsed.data.message,
        embedJson: parsed.data.embedJson ?? undefined,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId ?? null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        botId: parsed.data.botId ?? null,
        status: parsed.data.scheduledAt ? 'scheduled' : 'draft',
      },
    });

    return reply.status(201).send({ data: campaign });
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (existing.status === 'sending' || existing.status === 'sent') {
      return reply.status(400).send({ error: 'Cannot edit a campaign that is sending or already sent' });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.scheduledAt !== undefined) {
      updateData.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    }
    if (parsed.data.embedJson !== undefined) {
      updateData.embedJson = parsed.data.embedJson ?? undefined;
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    return { data: campaign };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (existing.status === 'sending') {
      return reply.status(400).send({ error: 'Cannot delete a campaign that is currently sending' });
    }

    await prisma.campaign.delete({ where: { id } });
    return { success: true };
  });

  app.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return reply.status(400).send({ error: 'Campaign is already sending or sent' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'sending' },
    });

    const simulatedSent = Math.floor(Math.random() * 100) + 10;
    const simulatedFailed = Math.floor(Math.random() * 5);

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'sent',
        sentCount: simulatedSent,
        failedCount: simulatedFailed,
      },
    });

    return { data: updated };
  });

  app.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status === 'sent') {
      return reply.status(400).send({ error: 'Cannot cancel a campaign that is already sent' });
    }

    if (campaign.status !== 'sending' && campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      return reply.status(400).send({ error: 'Campaign cannot be cancelled in its current state' });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { data: updated };
  });
}
