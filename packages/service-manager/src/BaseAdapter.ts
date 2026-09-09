import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ServiceMetrics {
  cpu: number;
  ram: number;
  ramUsed: number;
  ramTotal: number;
  disk: number;
  diskUsed: number;
  diskTotal: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  pid: number | null;
}

export interface HealthCheckResult {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  message: string;
  responseTime: number;
}

export interface ServiceAdapter {
  install(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  update(): Promise<void>;
  uninstall(): Promise<void>;
  getStatus(): Promise<string>;
  getPid(): Promise<number | null>;
  health(): Promise<HealthCheckResult>;
  logs(lines?: number): Promise<string[]>;
  metrics(): Promise<ServiceMetrics>;
  configure(config: Record<string, unknown>): Promise<void>;
}

export abstract class BaseServiceAdapter implements ServiceAdapter {
  protected installPath: string;
  protected serviceName: string;
  protected processName: string;

  constructor(config: { installPath: string; serviceName: string; processName: string }) {
    this.installPath = config.installPath;
    this.serviceName = config.serviceName;
    this.processName = config.processName;
  }

  abstract install(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract restart(): Promise<void>;
  abstract update(): Promise<void>;
  abstract uninstall(): Promise<void>;
  abstract getStatus(): Promise<string>;
  abstract health(): Promise<HealthCheckResult>;

  async getPid(): Promise<number | null> {
    try {
      const { stdout } = await execAsync(`pgrep -f "${this.processName}"`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      return pids.length > 0 ? parseInt(pids[0]) : null;
    } catch {
      return null;
    }
  }

  async logs(lines: number = 100): Promise<string[]> {
    const logFile = path.join(this.installPath, 'logs', 'app.log');
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const allLines = content.split('\n').filter(Boolean);
      return allLines.slice(-lines);
    } catch {
      return ['No logs available'];
    }
  }

  async metrics(): Promise<ServiceMetrics> {
    const pid = await this.getPid();
    
    if (!pid) {
      return {
        cpu: 0,
        ram: 0,
        ramUsed: 0,
        ramTotal: 0,
        disk: 0,
        diskUsed: 0,
        diskTotal: 0,
        networkRx: 0,
        networkTx: 0,
        uptime: 0,
        pid: null,
      };
    }

    try {
      const { stdout: psOutput } = await execAsync(
        `ps -p ${pid} -o %cpu,%mem,rss,etime --no-headers`
      );
      const [cpu, memPercent, rss, etime] = psOutput.trim().split(/\s+/);

      const { stdout: memOutput } = await execAsync('free -b | grep Mem');
      const memParts = memOutput.trim().split(/\s+/);
      const totalMem = parseInt(memParts[1]);
      const usedMem = parseInt(memParts[2]);

      const { stdout: diskOutput } = await execAsync(`df -B1 ${this.installPath} | tail -1`);
      const diskParts = diskOutput.trim().split(/\s+/);
      const diskTotal = parseInt(diskParts[1]);
      const diskUsed = parseInt(diskParts[2]);

      const uptimeSeconds = this.parseUptime(etime);

      return {
        cpu: parseFloat(cpu) || 0,
        ram: (parseInt(rss) * 1024) || 0,
        ramUsed: (parseInt(rss) * 1024) || 0,
        ramTotal: totalMem,
        disk: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
        diskUsed,
        diskTotal,
        networkRx: 0,
        networkTx: 0,
        uptime: uptimeSeconds,
        pid,
      };
    } catch {
      return {
        cpu: 0,
        ram: 0,
        ramUsed: 0,
        ramTotal: 0,
        disk: 0,
        diskUsed: 0,
        diskTotal: 0,
        networkRx: 0,
        networkTx: 0,
        uptime: 0,
        pid,
      };
    }
  }

  async configure(config: Record<string, unknown>): Promise<void> {
    const configFile = path.join(this.installPath, 'config.json');
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
  }

  protected parseUptime(etime: string): number {
    const parts = etime.split(/[:-]/);
    if (parts.length === 3) {
      const [days, hours, minutes] = parts;
      return parseInt(days) * 86400 + parseInt(hours) * 3600 + parseInt(minutes) * 60;
    }
    if (parts.length === 2) {
      const [hours, minutes] = parts;
      return parseInt(hours) * 3600 + parseInt(minutes) * 60;
    }
    return parseInt(etime) || 0;
  }

  protected async ensureInstallPath(): Promise<void> {
    try {
      await fs.access(this.installPath);
    } catch {
      await fs.mkdir(this.installPath, { recursive: true });
    }
  }
}
