import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import os from 'os';

export async function dashboardRoutes(app: FastifyInstance) {
  // Get dashboard overview
  app.get('/', async () => {
    // Get system metrics
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const loadAvg = os.loadavg();

    // Get applications status
    const applications = await prisma.application.findMany();
    const runningApps = applications.filter(a => a.status === 'RUNNING');
    const stoppedApps = applications.filter(a => a.status === 'STOPPED');
    const errorApps = applications.filter(a => a.status === 'ERROR');

    // Get alerts count
    const alertCount = await prisma.alert.count({
      where: { acknowledged: false },
    });

    // Get recent audit logs
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    return {
      system: {
        cpu: cpus,
        cpuUsage: Math.round((loadAvg[0] / cpus.length) * 100),
        ram: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: Math.round((usedMem / totalMem) * 100),
        },
        uptime,
        loadAverage: loadAvg,
        platform: os.platform(),
        hostname: os.hostname(),
      },
      applications: {
        total: applications.length,
        running: runningApps.length,
        stopped: stoppedApps.length,
        error: errorApps.length,
        list: applications.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          cpu: a.cpuUsage,
          ram: Number(a.ramUsage),
        })),
      },
      alerts: {
        unacknowledged: alertCount,
      },
      recentActivity: recentLogs.map(log => ({
        id: log.id,
        user: log.user?.name || 'Unknown',
        action: log.action,
        resource: log.resource,
        timestamp: log.createdAt,
      })),
    };
  });

  // Get system metrics history
  app.get('/metrics', async (request, reply) => {
    const { period = '1h' } = request.query as { period?: string };
    
    // TODO: Implement actual metrics collection and storage
    // For now return mock data structure
    return {
      cpu: [],
      ram: [],
      disk: [],
      network: [],
    };
  });
}
