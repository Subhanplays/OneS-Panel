import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

export async function analyticsRoutes(app: FastifyInstance) {
  // Get analytics overview
  app.get('/overview', async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalApplications,
      runningApplications,
      totalVps,
      totalAlerts,
      unacknowledgedAlerts,
      recentLogs,
      metrics24h,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'RUNNING' } }),
      prisma.application.count({ where: { type: 'VPS_DEPLOY_BOT' } }),
      prisma.alert.count(),
      prisma.alert.count({ where: { acknowledged: false } }),
      prisma.serviceLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.metric.findMany({
        where: { timestamp: { gte: last24h } },
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
    ]);

    return {
      data: {
        applications: {
          total: totalApplications,
          running: runningApplications,
          stopped: totalApplications - runningApplications,
        },
        vps: {
          total: totalVps,
        },
        alerts: {
          total: totalAlerts,
          unacknowledged: unacknowledgedAlerts,
        },
        logs: {
          last24h: recentLogs,
        },
        metrics: metrics24h,
      },
    };
  });

  // Get metrics history
  app.get('/metrics', async (request) => {
    const { period = '24h', source } = request.query as { period?: string; source?: string };
    
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

    const where: any = { timestamp: { gte: startDate } };
    if (source) {
      where.source = source;
    }

    const metrics = await prisma.metric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return { data: metrics };
  });

  // Get application usage stats
  app.get('/usage', async () => {
    const applications = await prisma.application.findMany({
      where: { status: 'RUNNING' },
      select: {
        id: true,
        name: true,
        type: true,
        cpuUsage: true,
        ramUsage: true,
        diskUsage: true,
      },
    });

    const totalCpu = applications.reduce((sum, app) => sum + app.cpuUsage, 0);
    const totalRam = applications.reduce((sum, app) => sum + Number(app.ramUsage), 0);
    const totalDisk = applications.reduce((sum, app) => sum + Number(app.diskUsage), 0);

    return {
      data: {
        applications,
        totals: {
          cpu: totalCpu,
          ram: totalRam,
          disk: totalDisk,
        },
      },
    };
  });
}
