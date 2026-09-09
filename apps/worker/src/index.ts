import 'dotenv/config';
import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '@ones-panel/database';
import { createAdapter, ServiceAdapter } from '@ones-panel/service-manager';
import * as os from 'os';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Job queues
export const applicationQueue = new Queue('applications', { connection });
export const metricsQueue = new Queue('metrics', { connection });
export const healthCheckQueue = new Queue('health-checks', { connection });
export const backupQueue = new Queue('backups', { connection });

// Helper to get adapter for application
async function getAdapterForApplication(applicationId: string): Promise<ServiceAdapter> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  const config = {
    installPath: application.installPath || `/opt/ones-panel/services/${application.slug}`,
    ...(application.config as Record<string, unknown>),
  };

  return createAdapter(application.type as any, config);
}

// Application worker
const applicationWorker = new Worker(
  'applications',
  async (job: Job) => {
    const { applicationId, action } = job.data;
    
    console.log(`Processing ${action} for application ${applicationId}`);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    try {
      const adapter = await getAdapterForApplication(applicationId);

      switch (action) {
        case 'install':
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'INSTALLING' },
          });
          await adapter.install();
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'INSTALLED', installedAt: new Date() },
          });
          break;

        case 'start':
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'STARTING' },
          });
          await adapter.start();
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'RUNNING', lastStartedAt: new Date() },
          });
          break;

        case 'stop':
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'STOPPING' },
          });
          await adapter.stop();
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'STOPPED', lastStoppedAt: new Date() },
          });
          break;

        case 'restart':
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'RESTARTING' },
          });
          await adapter.restart();
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'RUNNING', lastStartedAt: new Date() },
          });
          break;

        case 'update':
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'UPDATING' },
          });
          await adapter.update();
          await prisma.application.update({
            where: { id: applicationId },
            data: { status: 'RUNNING', lastUpdatedAt: new Date() },
          });
          break;

        case 'uninstall':
          await adapter.uninstall();
          await prisma.application.update({
            where: { id: applicationId },
            data: {
              status: 'NOT_INSTALLED',
              installedAt: null,
              lastStartedAt: null,
              lastStoppedAt: null,
              lastUpdatedAt: null,
              pid: null,
              cpuUsage: 0,
              ramUsage: 0,
              diskUsage: 0,
            },
          });
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Log service log
      await prisma.serviceLog.create({
        data: {
          serviceId: applicationId,
          level: 'INFO',
          message: `Action ${action} completed successfully`,
          metadata: { action, timestamp: new Date().toISOString() },
        },
      });

      return { success: true };
    } catch (err: any) {
      // Log error
      await prisma.serviceLog.create({
        data: {
          serviceId: applicationId,
          level: 'ERROR',
          message: `Action ${action} failed: ${err.message}`,
          metadata: { action, error: err.message, timestamp: new Date().toISOString() },
        },
      });

      // Update status to error
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'ERROR' },
      });

      throw err;
    }
  },
  { connection }
);

applicationWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for ${job.data.applicationId}`);
});

applicationWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Metrics worker (runs periodically)
const metricsWorker = new Worker(
  'metrics',
  async (job: Job) => {
    const { type } = job.data;
    
    if (type === 'system') {
      // Collect real system metrics
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const loadAvg = os.loadavg();
      const diskUsage = await getDiskUsage();

      const metrics = {
        cpu: Math.round((loadAvg[0] / cpus.length) * 100),
        ram: Math.round(((totalMem - freeMem) / totalMem) * 100),
        ramUsed: totalMem - freeMem,
        ramTotal: totalMem,
        disk: diskUsage,
        loadAverage: loadAvg,
        uptime: os.uptime(),
        hostname: os.hostname(),
        platform: os.platform(),
      };

      // Store metrics
      await prisma.metric.create({
        data: {
          source: 'system',
          metric: 'overview',
          value: metrics.cpu,
          tags: metrics,
        },
      });

      // Update application metrics
      const applications = await prisma.application.findMany({
        where: { status: 'RUNNING' },
      });

      for (const app of applications) {
        try {
          const adapter = await getAdapterForApplication(app.id);
          const appMetrics = await adapter.metrics();
          
          await prisma.application.update({
            where: { id: app.id },
            data: {
              cpuUsage: appMetrics.cpu,
              ramUsage: appMetrics.ram,
              diskUsage: appMetrics.disk,
              networkRx: appMetrics.networkRx,
              networkTx: appMetrics.networkTx,
              pid: appMetrics.pid,
            },
          });

          // Store app metrics
          await prisma.metric.create({
            data: {
              source: `app:${app.id}`,
              metric: 'overview',
              value: appMetrics.cpu,
              tags: appMetrics as any,
            },
          });
        } catch (error) {
          console.error(`Failed to collect metrics for app ${app.id}:`, error);
        }
      }
    }
  },
  { connection }
);

// Health check worker
const healthCheckWorker = new Worker(
  'health-checks',
  async (job: Job) => {
    const { applicationId } = job.data;
    
    console.log(`Running health check for application ${applicationId}`);
    
    try {
      const adapter = await getAdapterForApplication(applicationId);
      const healthResult = await adapter.health();
      
      await prisma.healthCheck.create({
        data: {
          serviceId: applicationId,
          status: healthResult.status,
          message: healthResult.message,
          responseTime: healthResult.responseTime,
        },
      });

      // Update application status based on health check
      if (healthResult.status === 'CRITICAL') {
        await prisma.application.update({
          where: { id: applicationId },
          data: { status: 'ERROR' },
        });
      }

      return { status: healthResult.status };
    } catch (err: any) {
      await prisma.healthCheck.create({
        data: {
          serviceId: applicationId,
          status: 'CRITICAL',
          message: `Health check failed: ${err.message}`,
          responseTime: 0,
        },
      });

      return { status: 'CRITICAL' };
    }
  },
  { connection }
);

// Backup worker
const backupWorker = new Worker(
  'backups',
  async (job: Job) => {
    const { type, backupId } = job.data;
    console.log(`Processing backup job: ${type}`);

    if (type === 'database') {
      const { execSync } = require('child_process');
      const path = require('path');
      const fs = require('fs');

      const backupDir = '/opt/ones-panel/backups';
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const filename = `db-backup-${Date.now()}.sql`;
      const filepath = path.join(backupDir, filename);

      try {
        const dbUrl = process.env.DATABASE_URL || '';
        execSync(`pg_dump "${dbUrl}" > "${filepath}"`, { timeout: 120000 });

        const stats = fs.statSync(filepath);
        if (backupId) {
          await prisma.backup.update({
            where: { id: backupId },
            data: { status: 'COMPLETED', size: stats.size },
          });
        } else {
          await prisma.backup.create({
            data: {
              name: filename,
              type: 'database',
              size: stats.size,
              path: filepath,
              status: 'COMPLETED',
            },
          });
        }
        console.log(`Database backup completed: ${filename}`);
      } catch (err) {
        console.error('Database backup failed:', err);
        if (backupId) {
          await prisma.backup.update({
            where: { id: backupId },
            data: { status: 'FAILED' },
          });
        }
      }
    }

    if (type === 'config') {
      const fs = require('fs');
      const path = require('path');

      const backupDir = '/opt/ones-panel/backups';
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const filename = `config-backup-${Date.now()}.json`;
      const filepath = path.join(backupDir, filename);

      try {
        const [settings, branding, applications] = await Promise.all([
          prisma.setting.findMany(),
          prisma.branding.findFirst(),
          prisma.application.findMany({ select: { name: true, type: true, config: true, slug: true } }),
        ]);

        const configData = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          settings: settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}),
          branding,
          applications,
        };

        fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
        const stats = fs.statSync(filepath);

        if (backupId) {
          await prisma.backup.update({
            where: { id: backupId },
            data: { status: 'COMPLETED', size: stats.size },
          });
        } else {
          await prisma.backup.create({
            data: {
              name: filename,
              type: 'config',
              size: stats.size,
              path: filepath,
              status: 'COMPLETED',
            },
          });
        }
        console.log(`Config backup completed: ${filename}`);
      } catch (err) {
        console.error('Config backup failed:', err);
        if (backupId) {
          await prisma.backup.update({
            where: { id: backupId },
            data: { status: 'FAILED' },
          });
        }
      }
    }
  },
  { connection }
);

// Alert evaluator - checks metrics against alert rules
async function evaluateAlertRules() {
  try {
    const rules = await prisma.setting.findMany({
      where: { category: 'alert-rules' },
    });

    for (const rule of rules) {
      try {
        const config = JSON.parse(rule.value);
        if (!config.enabled) continue;

        const { metric, condition, threshold } = config;
        let currentValue = 0;

        // Get latest metric value
        const latestMetric = await prisma.metric.findFirst({
          where: { source: 'system', metric },
          orderBy: { timestamp: 'desc' },
        });

        if (latestMetric) currentValue = latestMetric.value;

        let triggered = false;
        if (condition === 'gt' && currentValue > threshold) triggered = true;
        if (condition === 'lt' && currentValue < threshold) triggered = true;
        if (condition === 'eq' && currentValue === threshold) triggered = true;

        if (triggered) {
          // Check if alert already exists recently (within 5 minutes)
          const recentAlert = await prisma.alert.findFirst({
            where: {
              source: `rule-${rule.id}`,
              createdAt: { gte: new Date(Date.now() - 300000) },
            },
          });

          if (!recentAlert) {
            await prisma.alert.create({
              data: {
                title: `Alert: ${config.name || metric}`,
                message: `${metric} is ${currentValue}${condition === 'gt' ? '>' : condition === 'lt' ? '<' : '='}${threshold}`,
                severity: config.severity || 'WARNING',
                source: `rule-${rule.id}`,
                metadata: JSON.stringify({ ruleId: rule.id, currentValue, threshold, condition }),
              },
            });
            console.log(`Alert triggered: ${config.name || metric}`);
          }
        }
      } catch (err) {
        console.error(`Error evaluating rule ${rule.key}:`, err);
      }
    }
  } catch (err) {
    console.error('Alert evaluation error:', err);
  }
}

// VPS deployment queue
export const vpsDeployQueue = new Queue('vps-deploy', { connection });

const vpsDeployWorker = new Worker(
  'vps-deploy',
  async (job: Job) => {
    const { action, vpsId, params } = job.data;
    console.log(`Processing VPS deploy job: ${action}`);

    try {
      // Get VPS deploy bot adapter
      const app = await prisma.application.findFirst({
        where: { slug: 'vps-deploy-bot' },
      });

      if (!app) throw new Error('VPS Deploy Bot not installed');

      const adapter = createAdapter('vps-deploy-bot' as any, {
        installPath: app.installPath || '/opt/ones-panel/services/vps-deploy-bot',
        ...(app.config as Record<string, unknown>),
      });

      await job.updateProgress(10);

      if (action === 'create') {
        // Create VPS via adapter
        await job.updateProgress(50);
        // Actual creation handled by VPSDeployBotAdapter
      } else if (action === 'start') {
        await adapter.start();
      } else if (action === 'stop') {
        await adapter.stop();
      } else if (action === 'restart') {
        await adapter.restart();
      }

      await job.updateProgress(100);
      console.log(`VPS deploy job ${action} completed`);
    } catch (err) {
      console.error(`VPS deploy job ${action} failed:`, err);
      throw err;
    }
  },
  { connection }
);

// Helper to get disk usage
async function getDiskUsage(): Promise<number> {
  const { execSync } = require('child_process');
  try {
    const output = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim();
    return parseInt(output) || 0;
  } catch {
    return 0;
  }
}

// Schedule periodic jobs
async function scheduleJobs() {
  // Collect metrics every 30 seconds
  await metricsQueue.add('system-metrics', { type: 'system' }, {
    repeat: { every: 30000 },
  });

  // Health checks every minute for running applications
  const applications = await prisma.application.findMany({
    where: { status: 'RUNNING' },
  });

  for (const app of applications) {
    await healthCheckQueue.add(`health-${app.id}`, { applicationId: app.id }, {
      repeat: { every: 60000 },
    });
  }

  // Alert evaluation every 2 minutes
  setInterval(evaluateAlertRules, 120000);

  // Auto-backup check every hour
  setInterval(async () => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'backups.enabled' } });
      if (setting?.value === 'true') {
        const retentionSetting = await prisma.setting.findUnique({ where: { key: 'backups.retention_days' } });
        const retentionDays = parseInt(retentionSetting?.value || '30');

        // Clean old backups
        const cutoff = new Date(Date.now() - retentionDays * 86400000);
        const oldBackups = await prisma.backup.findMany({
          where: { createdAt: { lt: cutoff } },
        });

        for (const backup of oldBackups) {
          const fs = require('fs');
          try {
            if (fs.existsSync(backup.path)) fs.unlinkSync(backup.path);
          } catch {}
          await prisma.backup.delete({ where: { id: backup.id } });
        }

        if (oldBackups.length > 0) {
          console.log(`Cleaned ${oldBackups.length} old backups`);
        }
      }
    } catch (err) {
      console.error('Backup cleanup error:', err);
    }
  }, 3600000);
}

// Start worker
async function start() {
  console.log('Worker starting...');
  
  try {
    await prisma.$connect();
    console.log('Database connected');
    
    await scheduleJobs();
    console.log('Jobs scheduled');
    
    console.log('Worker is running');
  } catch (err) {
    console.error('Worker failed to start:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await applicationWorker.close();
  await metricsWorker.close();
  await healthCheckWorker.close();
  await backupWorker.close();
  await vpsDeployWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
