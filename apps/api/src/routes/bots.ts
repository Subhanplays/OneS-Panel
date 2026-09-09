import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

export async function botsRoutes(app: FastifyInstance) {
  // List all Discord bots
  app.get('/', async () => {
    const bots = await prisma.discordBot.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { data: bots };
  });

  // Get bot by ID
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    return { data: bot };
  });

  // Create new bot
  app.post('/', async (request, reply) => {
    const { name, token, guildId, applicationId, features, config } = request.body as any;

    if (!name || !token) {
      return reply.status(400).send({ error: 'Name and token are required' });
    }

    const bot = await prisma.discordBot.create({
      data: {
        name,
        token,
        guildId,
        applicationId,
        features: features || [],
        config: config || {},
      },
    });

    return { data: bot };
  });

  // Update bot
  app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body as any;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const updated = await prisma.discordBot.update({
      where: { id },
      data,
    });

    return { data: updated };
  });

  // Delete bot
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    await prisma.discordBot.delete({
      where: { id },
    });

    return { success: true };
  });

  // Toggle bot enabled/disabled
  app.post<{ Params: { id: string } }>('/:id/toggle', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const updated = await prisma.discordBot.update({
      where: { id },
      data: { enabled: !bot.enabled },
    });

    return { data: updated };
  });
}
