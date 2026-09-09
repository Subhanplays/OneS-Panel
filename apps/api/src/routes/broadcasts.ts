import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const createBroadcastSchema = z.object({
  botId: z.string().min(1),
  channelId: z.string().min(1),
  content: z.string().min(1),
  embedJson: z.any().optional(),
  rateLimitPerSec: z.number().int().min(1).max(50).default(1),
});

export async function broadcastRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const broadcasts = await prisma.broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: broadcasts };
  });

  app.post('/', async (request, reply) => {
    const parsed = createBroadcastSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const bot = await prisma.discordBot.findUnique({ where: { id: parsed.data.botId } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const broadcast = await prisma.broadcastMessage.create({
      data: {
        botId: parsed.data.botId,
        channelId: parsed.data.channelId,
        content: parsed.data.content,
        embedJson: parsed.data.embedJson ?? undefined,
        rateLimitPerSec: parsed.data.rateLimitPerSec,
        totalTargets: 0,
      },
    });

    return reply.status(201).send({ data: broadcast });
  });

  app.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };

    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id } });
    if (!broadcast) {
      return reply.status(404).send({ error: 'Broadcast not found' });
    }

    if (broadcast.status === 'sending') {
      return reply.status(400).send({ error: 'Broadcast is already sending' });
    }

    if (broadcast.status === 'completed') {
      return reply.status(400).send({ error: 'Broadcast has already completed' });
    }

    await prisma.broadcastMessage.update({
      where: { id },
      data: { status: 'sending' },
    });

    const simulatedSent = Math.floor(Math.random() * 200) + 50;
    const simulatedFailed = Math.floor(Math.random() * 10);

    const updated = await prisma.broadcastMessage.update({
      where: { id },
      data: {
        status: 'completed',
        sentCount: simulatedSent,
        failedCount: simulatedFailed,
        totalTargets: simulatedSent + simulatedFailed,
        completedAt: new Date(),
      },
    });

    return { data: updated };
  });

  app.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };

    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id } });
    if (!broadcast) {
      return reply.status(404).send({ error: 'Broadcast not found' });
    }

    if (broadcast.status === 'completed') {
      return reply.status(400).send({ error: 'Cannot cancel a completed broadcast' });
    }

    if (broadcast.status !== 'pending' && broadcast.status !== 'sending') {
      return reply.status(400).send({ error: 'Broadcast cannot be cancelled in its current state' });
    }

    const updated = await prisma.broadcastMessage.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { data: updated };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id } });
    if (!broadcast) {
      return reply.status(404).send({ error: 'Broadcast not found' });
    }

    if (broadcast.status === 'sending') {
      return reply.status(400).send({ error: 'Cannot delete a broadcast that is currently sending' });
    }

    await prisma.broadcastMessage.delete({ where: { id } });
    return { success: true };
  });
}
