import { BaseServiceAdapter, HealthCheckResult } from '../BaseAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface JTGConfig {
  installPath: string;
  port: number;
  nodeEnv: string;
  [key: string]: unknown;
}

export class JTGAdapter extends BaseServiceAdapter {
  private config: JTGConfig;

  constructor(config: JTGConfig) {
    super({
      installPath: config.installPath || '/opt/ones-panel/services/jtg',
      serviceName: 'jtg',
      processName: 'jtg',
    });
    this.config = config;
  }

  async install(): Promise<void> {
    await this.ensureInstallPath();

    console.log('Cloning JTG repository...');
    await execAsync(
      `git clone https://github.com/JishnuTheGamer/Jtg.git ${this.installPath}`,
      { cwd: path.dirname(this.installPath) }
    );

    console.log('Detecting dependencies...');
    const deps = await this.detectDependencies();

    console.log('Installing dependencies...');
    if (deps.hasPackageJson) {
      await execAsync('npm install', { cwd: this.installPath });
    }
    if (deps.hasRequirementsTxt) {
      await execAsync('pip install -r requirements.txt', { cwd: this.installPath });
    }

    if (deps.needsBuild) {
      console.log('Building application...');
      await this.build();
    }

    await this.writeConfig();
    console.log('JTG installed successfully');
  }

  async start(): Promise<void> {
    const deps = await this.detectDependencies();
    
    if (deps.isNodeApp) {
      await execAsync('pm2 start npm --name jtg -- start', {
        cwd: this.installPath,
      });
    } else if (deps.isPythonApp) {
      await execAsync(`pm2 start python3 --name jtg -- ${deps.mainFile}`, {
        cwd: this.installPath,
      });
    } else {
      await execAsync('pm2 start . --name jtg', {
        cwd: this.installPath,
      });
    }
  }

  async stop(): Promise<void> {
    try {
      await execAsync('pm2 stop jtg');
    } catch {
      await execAsync('pkill -f jtg', { timeout: 5000 }).catch(() => {});
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async update(): Promise<void> {
    await execAsync('git pull', { cwd: this.installPath });
    await this.install();
    await this.restart();
  }

  async uninstall(): Promise<void> {
    await this.stop();
    try {
      await execAsync('pm2 delete jtg');
    } catch {}
    await execAsync(`rm -rf ${this.installPath}`);
  }

  async getStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('pm2 jtg --no-colors 2>/dev/null || true');
      if (stdout.includes('online')) return 'RUNNING';
      if (stdout.includes('stopped')) return 'STOPPED';
      if (stdout.includes('errored')) return 'ERROR';
      return 'STOPPED';
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
        const response = await fetch(`http://localhost:${this.config.port || 3000}/api/health`, {
          signal: AbortSignal.timeout(5000),
        });
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          return { status: 'HEALTHY', message: 'Service responding', responseTime };
        }
        return { status: 'WARNING', message: 'Service unhealthy', responseTime };
      } catch {
        return { status: 'WARNING', message: 'HTTP check failed', responseTime: 0 };
      }
    }
    
    return { status: 'CRITICAL', message: 'Service not running', responseTime: 0 };
  }

  private async detectDependencies(): Promise<{
    hasPackageJson: boolean;
    hasRequirementsTxt: boolean;
    needsBuild: boolean;
    isNodeApp: boolean;
    isPythonApp: boolean;
    mainFile: string | null;
  }> {
    let hasPackageJson = false;
    let hasRequirementsTxt = false;
    let isNodeApp = false;
    let isPythonApp = false;
    let mainFile: string | null = null;
    let needsBuild = false;

    try {
      await fs.access(path.join(this.installPath, 'package.json'));
      hasPackageJson = true;
      isNodeApp = true;
      
      const pkg = JSON.parse(
        await fs.readFile(path.join(this.installPath, 'package.json'), 'utf-8')
      );
      if (pkg.scripts?.build) needsBuild = true;
    } catch {}

    try {
      await fs.access(path.join(this.installPath, 'requirements.txt'));
      hasRequirementsTxt = true;
      isPythonApp = true;
      mainFile = 'main.py';
    } catch {}

    try {
      await fs.access(path.join(this.installPath, 'main.py'));
      mainFile = 'main.py';
    } catch {}

    try {
      await fs.access(path.join(this.installPath, 'app.py'));
      mainFile = 'app.py';
    } catch {}

    return {
      hasPackageJson,
      hasRequirementsTxt,
      needsBuild,
      isNodeApp,
      isPythonApp,
      mainFile,
    };
  }

  private async build(): Promise<void> {
    const deps = await this.detectDependencies();
    if (deps.hasPackageJson) {
      await execAsync('npm run build', { cwd: this.installPath });
    }
  }

  private async writeConfig(): Promise<void> {
    const config = {
      port: this.config.port || 3000,
      nodeEnv: this.config.nodeEnv || 'production',
    };
    await fs.writeFile(
      path.join(this.installPath, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }
}
