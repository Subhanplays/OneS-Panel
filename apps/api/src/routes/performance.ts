import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

const alertRuleSchema = z.object({
  name: z.string(),
  metric: z.enum(['cpu', 'ram', 'disk', 'network']),
  condition: z.enum(['gt', 'lt', 'eq']),
  threshold: z.number(),
  duration: z.number().optional().default(60),
  enabled: z.boolean().optional().default(true),
  notify: z.array(z.enum(['panel', 'discord', 'email'])).optional().default(['panel']),
});

export async function performanceRoutes(app: FastifyInstance) {
  // Get current system metrics
  app.get('/current', async () => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    let diskInfo = { total: 0, used: 0, percentage: 0 };
    try {
      const { stdout } = await execAsync('df -B1 / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      diskInfo = {
        total: parseInt(parts[1]) || 0,
        used: parseInt(parts[2]) || 0,
        percentage: parseInt(parts[4]) || 0,
      };
    } catch {}

    let networkInfo = { rx: 0, tx: 0 };
    try {
      const { stdout } = await execAsync("cat /proc/net/dev | grep eth0 | awk '{print $2, $10}'");
      const [rx, tx] = stdout.trim().split(' ').map(Number);
      networkInfo = { rx: rx || 0, tx: tx || 0 };
    } catch {}

    return {
      cpu: {
        cores: cpus.length,
        usage: Math.round((loadAvg[0] / cpus.length) * 100),
        loadAverage: loadAvg,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        percentage: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      disk: diskInfo,
      network: networkInfo,
      uptime,
      hostname: os.hostname(),
      platform: os.platform(),
      timestamp: new Date().toISOString(),
    };
  });

  // Get metrics history
  app.get('/history', async (request, reply) => {
    const { period = '1h', source = 'system' } = request.query as { 
      period?: string; 
      source?: string;
    };

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const metrics = await prisma.metric.findMany({
      where: {
        source,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    return metrics;
  });

  // Store metrics (called by worker)
  app.post('/collect', async (request, reply) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();

    let diskPercentage = 0;
    try {
      const { stdout } = await execAsync('df -B1 / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      diskPercentage = parseInt(parts[4]) || 0;
    } catch {}

    const metrics = [
      { source: 'system', metric: 'cpu', value: Math.round((loadAvg[0] / cpus.length) * 100) },
      { source: 'system', metric: 'ram', value: Math.round(((totalMem - freeMem) / totalMem) * 100) },
      { source: 'system', metric: 'disk', value: diskPercentage },
      { source: 'system', metric: 'load1', value: loadAvg[0] },
      { source: 'system', metric: 'load5', value: loadAvg[1] },
      { source: 'system', metric: 'load15', value: loadAvg[2] },
    ];

    await prisma.metric.createMany({ data: metrics });

    // Check alert rules
    const rules = await prisma.setting.findMany({
      where: { key: { startsWith: 'alert.rule.' } },
    });

    for (const rule of rules) {
      try {
        const config = JSON.parse(rule.value);
        if (!config.enabled) continue;

        const metricValue = metrics.find(m => m.metric === config.metric)?.value;
        if (metricValue === undefined) continue;

        let triggered = false;
        switch (config.condition) {
          case 'gt':
            triggered = metricValue > config.threshold;
            break;
          case 'lt':
            triggered = metricValue < config.threshold;
            break;
          case 'eq':
            triggered = metricValue === config.threshold;
            break;
        }

        if (triggered) {
          await prisma.alert.create({
            data: {
              title: `Alert: ${config.name}`,
              message: `${config.metric} is ${metricValue}% (${config.condition} ${config.threshold}%)`,
              severity: 'WARNING',
              source: 'system',
              metadata: { metric: config.metric, value: metricValue, threshold: config.threshold },
            },
          });
        }
      } catch {}
    }

    return { success: true, metrics };
  });
}
