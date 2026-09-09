import { BaseServiceAdapter, HealthCheckResult } from './BaseAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface VPSDeployBotConfig {
  installPath: string;
  token?: string;
  guildId?: string;
  adminIds?: string[];
  adminRoleId?: string;
  maxVpsPerUser?: number;
  defaultOsImage?: string;
  dockerNetwork?: string;
  maxContainers?: number;
  // White-label configuration
  watermark?: string;
  welcomeMessage?: string;
  hostnamePrefix?: string;
  dockerImagePrefix?: string;
  [key: string]: unknown;
}

export interface VPSInstance {
  token: string;
  vpsId: string;
  containerId: string;
  memory: number;
  cpu: number;
  disk: number;
  username: string;
  password: string;
  rootPassword?: string;
  createdBy: string;
  createdAt: string;
  tmateSession?: string;
  watermark: string;
  osImage: string;
  restartCount: number;
  lastRestart?: string;
  status: 'running' | 'stopped' | 'suspended' | 'creating' | 'error';
  useCustomImage: boolean;
}

export interface CreateVPSParams {
  memory: number;
  cpu: number;
  disk: number;
  ownerId: string;
  osImage?: string;
  useCustomImage?: boolean;
}

export interface VPSStats {
  totalVpsCreated: number;
  totalRestarts: number;
  currentInstances: number;
  totalMemoryAllocated: number;
  totalCpuAllocated: number;
  totalDiskAllocated: number;
  runningInstances: number;
  stoppedInstances: number;
  suspendedInstances: number;
}

export class VPSDeployBotAdapter extends BaseServiceAdapter {
  private config: VPSDeployBotConfig;
  private dbFile: string;
  private deploymentsFile: string;

  constructor(config: VPSDeployBotConfig) {
    super({
      installPath: config.installPath || '/opt/ones-panel/services/vps-deploy-bot',
      serviceName: 'vps-deploy-bot',
      processName: 'bot.py',
    });
    this.config = config;
    this.dbFile = path.join(this.installPath, 'vps_instances.json');
    this.deploymentsFile = path.join(this.installPath, 'deployments.json');
  }

  async install(): Promise<void> {
    await this.ensureInstallPath();

    console.log('Installing VPS Deploy Bot...');

    // Create config.json
    const botConfig = {
      token: this.config.token,
      guild_id: this.config.guildId,
      admin_ids: this.config.adminIds?.join(',') || '',
      admin_role_id: this.config.adminRoleId || '',
      max_vps_per_user: this.config.maxVpsPerUser || 3,
      default_os_image: this.config.defaultOsImage || 'ubuntu:22.04',
      docker_network: this.config.dockerNetwork || 'bridge',
      max_containers: this.config.maxContainers || 100,
      // White-label
      watermark: this.config.watermark || 'VPS Service',
      welcome_message: this.config.welcomeMessage || 'Welcome! Get Started With Us!',
      hostname_prefix: this.config.hostnamePrefix || 'vps',
      docker_image_prefix: this.config.dockerImagePrefix || 'panel',
    };

    await fs.writeFile(
      path.join(this.installPath, 'config.json'),
      JSON.stringify(botConfig, null, 2)
    );

    // Create bot wrapper script that imports and runs bot.py logic
    const botWrapper = this.generateBotWrapper();
    await fs.writeFile(path.join(this.installPath, 'bot.js'), botWrapper);

    // Create Python bot script with white-label support
    const pythonBot = this.generatePythonBot();
    await fs.writeFile(path.join(this.installPath, 'bot.py'), pythonBot);

    // Create requirements.txt
    const requirements = [
      'discord.py>=2.3.0',
      'docker>=6.0.0',
      'psutil>=5.9.0',
      'python-dotenv>=1.0.0',
      'aiohttp>=3.8.0',
      'paramiko>=3.0.0',
    ].join('\n');

    await fs.writeFile(path.join(this.installPath, 'requirements.txt'), requirements);

    // Create Dockerfile for the bot
    const dockerfile = this.generateDockerfile();
    await fs.writeFile(path.join(this.installPath, 'Dockerfile'), dockerfile);

    // Create docker-compose.yml for the bot
    const dockerCompose = this.generateDockerCompose();
    await fs.writeFile(path.join(this.installPath, 'docker-compose.yml'), dockerCompose);

    // Initialize empty deployments file
    if (!await this.fileExists(this.deploymentsFile)) {
      await fs.writeFile(this.deploymentsFile, JSON.stringify([], null, 2));
    }

    // Initialize empty VPS instances file
    if (!await this.fileExists(this.dbFile)) {
      await fs.writeFile(this.dbFile, JSON.stringify({}, null, 2));
    }

    console.log('VPS Deploy Bot installed successfully');
  }

  async start(): Promise<void> {
    try {
      // Try to start with docker-compose first
      await execAsync('docker-compose up -d', { cwd: this.installPath });
    } catch {
      // Fallback to PM2
      try {
        await execAsync('pm2 start bot.py --name vps-deploy-bot --interpreter python3', {
          cwd: this.installPath,
        });
      } catch {
        // Fallback to direct execution
        await execAsync('nohup python3 bot.py > logs/bot.log 2>&1 &', {
          cwd: this.installPath,
        });
      }
    }
  }

  async stop(): Promise<void> {
    try {
      await execAsync('docker-compose down', { cwd: this.installPath });
    } catch {
      try {
        await execAsync('pm2 stop vps-deploy-bot');
      } catch {
        await execAsync('pkill -f "python3 bot.py"', { timeout: 5000 }).catch(() => {});
      }
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async update(): Promise<void> {
    await execAsync('pip3 install -r requirements.txt --upgrade', { cwd: this.installPath });
    await this.restart();
  }

  async uninstall(): Promise<void> {
    await this.stop();
    try {
      await execAsync('pm2 delete vps-deploy-bot');
    } catch {}
    try {
      await execAsync('docker-compose down -v', { cwd: this.installPath });
    } catch {}
    await execAsync(`rm -rf ${this.installPath}`);
  }

  async getStatus(): Promise<string> {
    try {
      // Check docker-compose status
      const { stdout } = await execAsync('docker-compose ps --services 2>/dev/null || true', {
        cwd: this.installPath,
      });
      if (stdout.includes('vps-deploy-bot') && stdout.includes('Up')) return 'RUNNING';
      
      // Check PM2 status
      const { stdout: pm2Output } = await execAsync('pm2 status --no-colors 2>/dev/null || true');
      if (pm2Output.includes('vps-deploy-bot') && pm2Output.includes('online')) return 'RUNNING';
      if (pm2Output.includes('vps-deploy-bot') && pm2Output.includes('stopped')) return 'STOPPED';
      
      // Check if process is running
      const pid = await this.getPid();
      return pid ? 'RUNNING' : 'STOPPED';
    } catch {
      const pid = await this.getPid();
      return pid ? 'RUNNING' : 'STOPPED';
    }
  }

  async health(): Promise<HealthCheckResult> {
    const status = await this.getStatus();
    
    if (status === 'RUNNING') {
      try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:3001/api/bots/vps-deploy/health', {
          signal: AbortSignal.timeout(5000),
        });
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          return { status: 'HEALTHY', message: 'Bot is connected', responseTime };
        }
        return { status: 'WARNING', message: 'Bot health check failed', responseTime };
      } catch {
        return { status: 'WARNING', message: 'Health check endpoint unavailable', responseTime: 0 };
      }
    }
    
    return { status: 'CRITICAL', message: 'Bot not running', responseTime: 0 };
  }

  // VPS Management Methods
  async listVPS(): Promise<VPSInstance[]> {
    try {
      const data = await fs.readFile(this.dbFile, 'utf-8');
      const instances = JSON.parse(data);
      return Object.values(instances) as VPSInstance[];
    } catch {
      return [];
    }
  }

  async getVPS(vpsId: string): Promise<VPSInstance | null> {
    try {
      const instances = await this.listVPS();
      return instances.find(v => v.vpsId === vpsId) || null;
    } catch {
      return null;
    }
  }

  async getVPSByToken(token: string): Promise<VPSInstance | null> {
    try {
      const instances = await this.listVPS();
      return instances.find(v => v.token === token) || null;
    } catch {
      return null;
    }
  }

  async getUserVPS(userId: string): Promise<VPSInstance[]> {
    try {
      const instances = await this.listVPS();
      return instances.filter(v => v.createdBy === userId);
    } catch {
      return [];
    }
  }

  async createVPS(params: CreateVPSParams): Promise<VPSInstance> {
    const { memory, cpu, disk, ownerId, osImage, useCustomImage = true } = params;

    // Validate inputs
    if (memory < 1 || memory > 512) {
      throw new Error('Memory must be between 1GB and 512GB');
    }
    if (cpu < 1 || cpu > 32) {
      throw new Error('CPU cores must be between 1 and 32');
    }
    if (disk < 10 || disk > 1000) {
      throw new Error('Disk space must be between 10GB and 1000GB');
    }

    // Check container limit
    const instances = await this.listVPS();
    const maxContainers = this.config.maxContainers || 100;
    if (instances.length >= maxContainers) {
      throw new Error(`Maximum container limit reached (${maxContainers})`);
    }

    // Check user VPS limit
    const userVps = instances.filter(v => v.createdBy === ownerId);
    const maxVpsPerUser = this.config.maxVpsPerUser || 3;
    if (userVps.length >= maxVpsPerUser) {
      throw new Error(`User already has maximum number of VPS instances (${maxVpsPerUser})`);
    }

    // Generate VPS details
    const vpsId = this.generateVPSId();
    const token = this.generateToken();
    const username = `user_${vpsId.toLowerCase()}`;
    const password = this.generatePassword();
    const rootPassword = this.generatePassword();

    const hostnamePrefix = this.config.hostnamePrefix || 'vps';
    const dockerImagePrefix = this.config.dockerImagePrefix || 'panel';
    const watermark = this.config.watermark || 'VPS Service';
    const welcomeMessage = this.config.welcomeMessage || 'Welcome!';

    // Create VPS instance record
    const vpsInstance: VPSInstance = {
      token,
      vpsId,
      containerId: '',
      memory,
      cpu,
      disk,
      username,
      password,
      rootPassword,
      createdBy: ownerId,
      createdAt: new Date().toISOString(),
      watermark,
      osImage: osImage || this.config.defaultOsImage || 'ubuntu:22.04',
      restartCount: 0,
      status: 'creating',
      useCustomImage,
    };

    try {
      // Build Docker image if using custom image
      if (useCustomImage) {
        const imageTag = `${dockerImagePrefix}/${vpsId.toLowerCase()}:latest`;
        await this.buildDockerImage(vpsId, username, rootPassword, password, imageTag);
        vpsInstance.osImage = imageTag;
      }

      // Create and start container
      const containerId = await this.createContainer(vpsId, vpsInstance);
      vpsInstance.containerId = containerId;

      // Setup container
      await this.setupContainer(containerId, vpsInstance);

      // Start tmate session
      const tmateSession = await this.startTmateSession(containerId);
      vpsInstance.tmateSession = tmateSession;

      vpsInstance.status = 'running';

      // Save to database
      await this.saveVPS(vpsInstance);

      return vpsInstance;
    } catch (error) {
      vpsInstance.status = 'error';
      await this.saveVPS(vpsInstance);
      throw error;
    }
  }

  async startVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    if (vps.status === 'suspended') {
      throw new Error('VPS is suspended');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      await container.start();

      vps.status = 'running';
      await this.saveVPS(vps);
    } catch (error) {
      throw new Error(`Failed to start VPS: ${error}`);
    }
  }

  async stopVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      await container.stop();

      vps.status = 'stopped';
      await this.saveVPS(vps);
    } catch (error) {
      throw new Error(`Failed to stop VPS: ${error}`);
    }
  }

  async restartVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    if (vps.status === 'suspended') {
      throw new Error('VPS is suspended');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      await container.restart();

      vps.restartCount++;
      vps.lastRestart = new Date().toISOString();
      vps.status = 'running';

      // Get new tmate session
      const tmateSession = await this.startTmateSession(vps.containerId);
      vps.tmateSession = tmateSession;

      await this.saveVPS(vps);
    } catch (error) {
      throw new Error(`Failed to restart VPS: ${error}`);
    }
  }

  async deleteVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      
      try {
        await container.stop();
      } catch {}
      
      await container.remove({ v: true, force: true });

      await this.removeVPS(vps.token);
    } catch (error) {
      throw new Error(`Failed to delete VPS: ${error}`);
    }
  }

  async suspendVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    if (vps.status === 'suspended') {
      throw new Error('VPS is already suspended');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      await container.stop();

      vps.status = 'suspended';
      await this.saveVPS(vps);
    } catch (error) {
      throw new Error(`Failed to suspend VPS: ${error}`);
    }
  }

  async unsuspendVPS(vpsId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    if (vps.status !== 'suspended') {
      throw new Error('VPS is not suspended');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      await container.start();

      vps.status = 'running';
      await this.saveVPS(vps);
    } catch (error) {
      throw new Error(`Failed to unsuspend VPS: ${error}`);
    }
  }

  async transferVPS(vpsId: string, newOwnerId: string): Promise<void> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    vps.createdBy = newOwnerId;
    await this.saveVPS(vps);
  }

  async getVPSStats(): Promise<VPSStats> {
    const instances = await this.listVPS();
    
    return {
      totalVpsCreated: instances.length,
      totalRestarts: instances.reduce((sum, v) => sum + v.restartCount, 0),
      currentInstances: instances.length,
      totalMemoryAllocated: instances.reduce((sum, v) => sum + v.memory, 0),
      totalCpuAllocated: instances.reduce((sum, v) => sum + v.cpu, 0),
      totalDiskAllocated: instances.reduce((sum, v) => sum + v.disk, 0),
      runningInstances: instances.filter(v => v.status === 'running').length,
      stoppedInstances: instances.filter(v => v.status === 'stopped').length,
      suspendedInstances: instances.filter(v => v.status === 'suspended').length,
    };
  }

  async getVPSMetrics(vpsId: string): Promise<Record<string, unknown>> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      
      const stats = await container.stats({ stream: false });
      
      return {
        cpu: {
          usage: stats.cpu_stats?.cpu_usage?.total_usage || 0,
          systemCpuUsage: stats.cpu_stats?.system_cpu_usage || 0,
          onlineCpus: stats.cpu_stats?.online_cpus || 1,
        },
        memory: {
          usage: stats.memory_stats?.usage || 0,
          limit: stats.memory_stats?.limit || 0,
          usagePercent: stats.memory_stats?.usage 
            ? (stats.memory_stats.usage / (stats.memory_stats.limit || 1)) * 100 
            : 0,
        },
        network: stats.networks || {},
        blockIO: stats.blkio_stats || {},
      };
    } catch (error) {
      throw new Error(`Failed to get VPS metrics: ${error}`);
    }
  }

  async changePassword(vpsId: string): Promise<string> {
    const vps = await this.getVPS(vpsId);
    if (!vps) {
      throw new Error('VPS not found');
    }

    const newPassword = this.generatePassword();

    try {
      const docker = await this.getDockerClient();
      const container = await docker.getContainer(vps.containerId);
      
      await container.exec({
        Cmd: ['bash', '-c', `echo '${vps.username}:${newPassword}' | chpasswd`],
        Attach: true,
      });

      vps.password = newPassword;
      await this.saveVPS(vps);

      return newPassword;
    } catch (error) {
      throw new Error(`Failed to change password: ${error}`);
    }
  }

  // Helper methods
  private generateVPSId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async getDockerClient(): Promise<any> {
    const docker = require('dockerode');
    return new docker();
  }

  private async buildDockerImage(
    vpsId: string,
    username: string,
    rootPassword: string,
    userPassword: string,
    imageTag: string
  ): Promise<void> {
    const hostnamePrefix = this.config.hostnamePrefix || 'vps';
    const watermark = this.config.watermark || 'VPS Service';
    const welcomeMessage = this.config.welcomeMessage || 'Welcome!';

    const dockerfile = `
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \\
    apt-get install -y systemd systemd-sysv dbus sudo \\
                       curl gnupg2 apt-transport-https ca-certificates \\
                       software-properties-common \\
                       docker.io openssh-server tmate && \\
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN echo "root:${rootPassword}" | chpasswd

RUN useradd -m -s /bin/bash ${username} && \\
    echo "${username}:${userPassword}" | chpasswd && \\
    usermod -aG sudo ${username}

RUN mkdir /var/run/sshd && \\
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \\
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

RUN systemctl enable ssh && \\
    systemctl enable docker

RUN echo '${welcomeMessage}' > /etc/motd && \\
    echo 'echo "${welcomeMessage}"' >> /home/${username}/.bashrc && \\
    echo '${watermark}' > /etc/machine-info && \\
    echo '${hostnamePrefix}-${vpsId}' > /etc/hostname

RUN apt-get update && \\
    apt-get install -y neofetch htop nano vim wget git tmux net-tools dnsutils iputils-ping && \\
    apt-get clean && \\
    rm -rf /var/lib/apt/lists/*

STOPSIGNAL SIGRTMIN+3

CMD ["/sbin/init"]
`;

    const tempDir = path.join(this.installPath, 'temp_dockerfiles', vpsId);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), dockerfile);

    try {
      await execAsync(`docker build -t ${imageTag} ${tempDir}`);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async createContainer(vpsId: string, vps: VPSInstance): Promise<string> {
    const docker = await this.getDockerClient();
    const hostnamePrefix = this.config.hostnamePrefix || 'vps';
    const dockerNetwork = this.config.dockerNetwork || 'bridge';

    const memoryBytes = vps.memory * 1024 * 1024 * 1024;
    const cpuQuota = vps.cpu * 100000;

    const container = await docker.createContainer({
      Image: vps.osImage,
      Hostname: `${hostnamePrefix}-${vpsId}`,
      Cmd: vps.useCustomImage ? undefined : ['tail -f /dev/null'],
      Tty: !vps.useCustomImage,
      User: 'root',
      HostConfig: {
        Privileged: true,
        Memory: memoryBytes,
        CpuPeriod: 100000,
        CpuQuota: cpuQuota,
        CapAdd: ['ALL'],
        NetworkMode: dockerNetwork,
        Binds: [`${hostnamePrefix}-${vpsId}:/data:rw`],
        RestartPolicy: { Name: 'always' },
      },
    });

    await container.start();
    return container.id;
  }

  private async setupContainer(containerId: string, vps: VPSInstance): Promise<void> {
    const commands = [
      `useradd -m -s /bin/bash ${vps.username} || true`,
      `echo '${vps.username}:${vps.password}' | chpasswd`,
      `usermod -aG sudo ${vps.username}`,
      `sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config`,
      `sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config`,
      `service ssh restart`,
    ];

    for (const cmd of commands) {
      await this.execInContainer(containerId, cmd);
    }
  }

  private async startTmateSession(containerId: string): Promise<string> {
    const docker = await this.getDockerClient();
    const container = await docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['tmate', '-F'],
      Attach: true,
      Stream: true,
    });

    return new Promise((resolve, reject) => {
      let sessionLine = '';
      const stream = exec.start({ Tty: true });

      stream.on('data', (chunk: Buffer) => {
        const output = chunk.toString();
        sessionLine += output;

        const match = sessionLine.match(/ssh session:\s*(.+)/);
        if (match) {
          resolve(match[1].trim());
          stream.destroy();
        }
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });

      setTimeout(() => {
        stream.destroy();
        reject(new Error('Timeout waiting for tmate session'));
      }, 30000);
    });
  }

  private async execInContainer(containerId: string, command: string): Promise<void> {
    const docker = await this.getDockerClient();
    const container = await docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['bash', '-c', command],
      Attach: true,
    });

    await new Promise<void>((resolve, reject) => {
      exec.start((error: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async saveVPS(vps: VPSInstance): Promise<void> {
    const instances = await this.listVPS();
    const index = instances.findIndex(v => v.token === vps.token);
    
    if (index >= 0) {
      instances[index] = vps;
    } else {
      instances.push(vps);
    }

    const data: Record<string, VPSInstance> = {};
    for (const instance of instances) {
      data[instance.token] = instance;
    }

    await fs.writeFile(this.dbFile, JSON.stringify(data, null, 2));
  }

  private async removeVPS(token: string): Promise<void> {
    const instances = await this.listVPS();
    const filtered = instances.filter(v => v.token !== token);

    const data: Record<string, VPSInstance> = {};
    for (const instance of filtered) {
      data[instance.token] = instance;
    }

    await fs.writeFile(this.dbFile, JSON.stringify(data, null, 2));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateBotWrapper(): string {
    return `// Bot wrapper - runs Python bot.py
const { spawn } = require('child_process');
const path = require('path');

const bot = spawn('python3', [path.join(__dirname, 'bot.py')], {
  cwd: __dirname,
  stdio: 'inherit',
});

bot.on('error', (err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

bot.on('close', (code) => {
  console.log(\`Bot exited with code \${code}\`);
  process.exit(code);
});

process.on('SIGINT', () => {
  bot.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.kill('SIGTERM');
  process.exit(0);
});
`;
  }

  private generatePythonBot(): string {
    const watermark = this.config.watermark || 'VPS Service';
    const welcomeMessage = this.config.welcomeMessage || 'Welcome!';
    const hostnamePrefix = this.config.hostnamePrefix || 'vps';
    const dockerImagePrefix = this.config.dockerImagePrefix || 'panel';
    const maxVpsPerUser = this.config.maxVpsPerUser || 3;
    const defaultOsImage = this.config.defaultOsImage || 'ubuntu:22.04';
    const dockerNetwork = this.config.dockerNetwork || 'bridge';
    const maxContainers = this.config.maxContainers || 100;

    return `import os
import json
import random
import string
import asyncio
import datetime
import logging
import docker
import aiohttp
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('VPSDeployBot')

# White-label configuration
WATERMARK = "${watermark}"
WELCOME_MESSAGE = "${welcomeMessage}"
HOSTNAME_PREFIX = "${hostnamePrefix}"
DOCKER_IMAGE_PREFIX = "${dockerImagePrefix}"
MAX_VPS_PER_USER = ${maxVpsPerUser}
DEFAULT_OS_IMAGE = "${defaultOsImage}"
DOCKER_NETWORK = "${dockerNetwork}"
MAX_CONTAINERS = ${maxContainers}

# Database file
DB_FILE = 'vps_instances.json'

def load_db():
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def generate_vps_id():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=10))

def generate_token():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=24))

def generate_password():
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choices(chars, k=16))

async def main():
    logger.info("VPS Deploy Bot starting...")
    
    # Initialize Docker client
    try:
        docker_client = docker.from_env()
        logger.info("Docker client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Docker client: {e}")
        return
    
    # Main loop
    while True:
        try:
            # Monitor VPS instances
            db = load_db()
            for token, vps in list(db.items()):
                if vps.get('status') == 'running':
                    try:
                        container = docker_client.containers.get(vps['container_id'])
                        if container.status != 'running':
                            container.start()
                            logger.info(f"Started container for VPS {vps['vps_id']}")
                    except docker.errors.NotFound:
                        logger.warning(f"Container {vps['container_id']} not found")
                    except Exception as e:
                        logger.error(f"Error with container {vps['vps_id']}: {e}")
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateDockerfile(): string {
    return `FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \\
    docker.io \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "bot.py"]
`;
  }

  private generateDockerCompose(): string {
    return `version: '3.8'

services:
  vps-deploy-bot:
    build: .
    container_name: vps-deploy-bot
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config.json:/app/config.json
      - ./vps_instances.json:/app/vps_instances.json
    environment:
      - DISCORD_TOKEN=\${DISCORD_TOKEN}
    networks:
      - ${this.config.dockerNetwork || 'bridge'}

networks:
  ${this.config.dockerNetwork || 'bridge'}:
    external: true
`;
  }
}
