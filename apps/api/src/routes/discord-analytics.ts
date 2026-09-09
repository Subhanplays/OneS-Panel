import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

export async function discordAnalyticsRoutes(app: FastifyInstance) {
  // Get aggregate analytics across all bots
  app.get('/overview', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalBots,
      totalGuilds,
      totalMembers,
      newMembers,
      totalMessages,
      activeUsers,
      botCommands,
      ticketCount,
      verificationCount,
    ] = await Promise.all([
      prisma.discordBot.count({ where: { enabled: true } }),
      prisma.discordAnalytics.findMany({
        where: { metric: 'guild_count' },
        distinct: ['guildId'],
        select: { guildId: true },
      }).then(r => r.length),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { metric: 'member_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: {
          metric: 'new_members',
          recordedAt: { gte: last24h },
        },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { metric: 'message_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: {
          metric: 'active_users',
          recordedAt: { gte: last24h },
        },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { metric: 'bot_command' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { metric: 'ticket_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { metric: 'verification_count' },
      }).then(r => r._sum.value || 0),
    ]);

    return {
      data: {
        totalBots,
        totalGuilds,
        totalMembers,
        newMembers24h: newMembers,
        totalMessages,
        activeUsers24h: activeUsers,
        botCommands,
        ticketCount,
        verificationCount,
      },
    };
  });

  // Get analytics for specific bot
  app.get<{ Params: { botId: string } }>('/:botId', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { botId } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id: botId } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      guilds,
      totalMembers,
      newMembers24h,
      totalMessages,
      activeUsers24h,
      botCommands,
      ticketCount,
      verificationCount,
      recentMetrics,
    ] = await Promise.all([
      prisma.discordAnalytics.findMany({
        where: { botId, metric: 'guild_count' },
        distinct: ['guildId'],
        select: { guildId: true },
      }).then(r => r.length),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { botId, metric: 'member_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: {
          botId,
          metric: 'new_members',
          recordedAt: { gte: last24h },
        },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { botId, metric: 'message_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: {
          botId,
          metric: 'active_users',
          recordedAt: { gte: last24h },
        },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { botId, metric: 'bot_command' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { botId, metric: 'ticket_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.aggregate({
        _sum: { value: true },
        where: { botId, metric: 'verification_count' },
      }).then(r => r._sum.value || 0),
      prisma.discordAnalytics.findMany({
        where: { botId, recordedAt: { gte: last7d } },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      data: {
        bot: { id: bot.id, name: bot.name },
        guilds,
        totalMembers,
        newMembers24h,
        totalMessages,
        activeUsers24h,
        botCommands,
        ticketCount,
        verificationCount,
        recentMetrics,
      },
    };
  });

  // Manually trigger analytics collection
  app.post('/collect', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can trigger collection' });
    }

    // In real implementation, this would call the analytics adapter
    // to collect data from Discord API for all enabled bots
    const bots = await prisma.discordBot.findMany({
      where: { enabled: true },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'discord_analytics',
        resourceId: 'collection',
        details: { botCount: bots.length },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return {
      data: {
        triggered: true,
        botCount: bots.length,
        message: 'Analytics collection triggered for all enabled bots',
      },
    };
  });

  // Get metrics history with period filter
  app.get('/history', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { period = '24h', botId, metric } = request.query as {
      period?: string;
      botId?: string;
      metric?: string;
    };

    let startDate: Date;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const where: any = { recordedAt: { gte: startDate } };
    if (botId) where.botId = botId;
    if (metric) where.metric = metric;

    const metrics = await prisma.discordAnalytics.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });

    return { data: metrics };
  });
}
