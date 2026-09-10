import { BaseServiceAdapter, HealthCheckResult } from '../BaseAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface StatusPageConfig {
  installPath: string;
  port: number;
  [key: string]: unknown;
}

export class StatusPageAdapter extends BaseServiceAdapter {
  private config: StatusPageConfig;

  constructor(config: StatusPageConfig) {
    super({
      installPath: config.installPath || '/opt/ones-panel/services/status-page',
      serviceName: 'status-page',
      processName: 'status-page',
    });
    this.config = config;
  }

  async install(): Promise<void> {
    await this.ensureInstallPath();

    console.log('Installing Status Page...');

    const packageJson = {
      name: 'ones-panel-status-page',
      version: '1.0.0',
      scripts: {
        start: 'node server.js',
        dev: 'node server.js',
      },
      dependencies: {
        express: '^4.18.0',
        cors: '^2.8.0',
      },
    };

    await fs.writeFile(
      path.join(this.installPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const serverCode = `
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || ${this.config.port || 3002};

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { services: [], incidents: [], maintenance: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', (req, res) => {
  const data = loadData();
  res.json(data);
});

app.post('/api/services', (req, res) => {
  const data = loadData();
  const service = {
    id: Date.now().toString(),
    ...req.body,
    status: req.body.status || 'operational',
    createdAt: new Date().toISOString(),
  };
  data.services.push(service);
  saveData(data);
  res.json(service);
});

app.put('/api/services/:id', (req, res) => {
  const data = loadData();
  const index = data.services.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  data.services[index] = { ...data.services[index], ...req.body };
  saveData(data);
  res.json(data.services[index]);
});

app.delete('/api/services/:id', (req, res) => {
  const data = loadData();
  data.services = data.services.filter(s => s.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.post('/api/incidents', (req, res) => {
  const data = loadData();
  const incident = {
    id: Date.now().toString(),
    ...req.body,
    status: req.body.status || 'investigating',
    createdAt: new Date().toISOString(),
  };
  data.incidents.unshift(incident);
  saveData(data);
  res.json(incident);
});

app.put('/api/incidents/:id', (req, res) => {
  const data = loadData();
  const index = data.incidents.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  data.incidents[index] = { ...data.incidents[index], ...req.body };
  saveData(data);
  res.json(data.incidents[index]);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Status Page running on port ' + PORT);
});
`;

    await fs.writeFile(path.join(this.installPath, 'server.js'), serverCode);

    await execAsync('npm install', { cwd: this.installPath });
    console.log('Status Page installed successfully');
  }

  async start(): Promise<void> {
    await execAsync('pm2 start server.js --name status-page', {
      cwd: this.installPath,
    });
  }

  async stop(): Promise<void> {
    try {
      await execAsync('pm2 stop status-page');
    } catch {
      await execAsync('pkill -f status-page', { timeout: 5000 }).catch(() => {});
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async update(): Promise<void> {
    await execAsync('npm update', { cwd: this.installPath });
    await this.restart();
  }

  async uninstall(): Promise<void> {
    await this.stop();
    try {
      await execAsync('pm2 delete status-page');
    } catch {}
    await execAsync(`rm -rf ${this.installPath}`);
  }

  async getStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('pm2 status --no-colors 2>/dev/null || true');
      if (stdout.includes('status-page') && stdout.includes('online')) return 'RUNNING';
      if (stdout.includes('status-page') && stdout.includes('stopped')) return 'STOPPED';
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
        const response = await fetch(`http://localhost:${this.config.port || 3002}/api/health`, {
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
}
