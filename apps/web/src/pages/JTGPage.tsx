import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatBytes, formatUptime } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  Settings,
  FileText,
  ExternalLink,
  Cpu,
  HardDrive,
  Network,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpCircle,
} from 'lucide-react';

interface JTGStatus {
  running: boolean;
  version: string;
  uptime: number;
}

interface JTGResources {
  cpu: { usage: number; cores: number };
  ram: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { rx: number; tx: number };
}

interface JTGLog {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

interface JTGConfig {
  serverId: string;
  port: number;
  maxConnections: number;
  compression: boolean;
  encryption: boolean;
}

interface JTGHealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  responseTime: number;
}

interface JTGChartPoint {
  time: number;
  cpu: number;
  ram: number;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function JTGPage() {
  const [status, setStatus] = useState<JTGStatus | null>(null);
  const [resources, setResources] = useState<JTGResources | null>(null);
  const [logs, setLogs] = useState<JTGLog[]>([]);
  const [config, setConfig] = useState<JTGConfig | null>(null);
  const [healthChecks, setHealthChecks] = useState<JTGHealthCheck[]>([]);
  const [chartData, setChartData] = useState<JTGChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [statusRes, resourcesRes, logsRes, configRes, healthRes] = await Promise.all([
        api.get('/jtg/status'),
        api.get('/jtg/resources'),
        api.get('/jtg/logs', { params: { limit: 50 } }),
        api.get('/jtg/config'),
        api.get('/jtg/health'),
      ]);
      setStatus(statusRes.data);
      setResources(resourcesRes.data);
      setLogs(logsRes.data);
      setConfig(configRes.data);
      setHealthChecks(healthRes.data);

      setChartData((prev) => {
        const newPoint: JTGChartPoint = {
          time: Date.now(),
          cpu: resourcesRes.data.cpu.usage,
          ram: resourcesRes.data.ram.percentage,
        };
        const updated = [...prev, newPoint].slice(-30);
        return updated;
      });
    } catch (err) {
      console.error('Failed to fetch JTG data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'update') => {
    setActionLoading(action);
    try {
      await api.post(`/jtg/${action}`);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} JTG:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenJTG = () => {
    window.open('http://localhost:25565', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">JTG Management</h1>
          <p className="text-muted-foreground">Monitor and manage the JTG service</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Header */}
      {status && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">JTG Service</h2>
                    <Badge
                      className={
                        status.running
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }
                    >
                      {status.running ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Version: {status.version}</span>
                    <span>Uptime: {formatUptime(status.uptime)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOpenJTG} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open JTG
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Cards */}
      {resources && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPU</p>
                  <p className="text-3xl font-bold">{resources.cpu.usage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {resources.cpu.cores} cores
                  </p>
                </div>
                <Cpu className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${resources.cpu.usage}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RAM</p>
                  <p className="text-3xl font-bold">{resources.ram.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(resources.ram.used)} / {formatBytes(resources.ram.total)}
                  </p>
                </div>
                <HardDrive className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${resources.ram.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disk</p>
                  <p className="text-3xl font-bold">{resources.disk.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(resources.disk.used)} / {formatBytes(resources.disk.total)}
                  </p>
                </div>
                <HardDrive className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${resources.disk.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Network</p>
                  <p className="text-3xl font-bold">{formatBytes(resources.network.rx)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    RX / TX: {formatBytes(resources.network.tx)}
                  </p>
                </div>
                <Network className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {status?.running ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading === 'stop'}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading === 'restart'}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleAction('start')}
                disabled={actionLoading === 'start'}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleAction('update')}
              disabled={actionLoading === 'update'}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Update
            </Button>
            <Button variant="outline" onClick={() => window.open('#logs', '_self')}>
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </Button>
            <Button variant="outline" onClick={() => window.open('#settings', '_self')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Collecting metrics...
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                    className="text-xs"
                  />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" dot={false} name="CPU" />
                  <Line type="monotone" dataKey="ram" stroke="#22c55e" dot={false} name="RAM" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Viewer */}
      <Card id="logs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Logs</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No logs available</div>
          ) : (
            <div className="bg-secondary rounded-lg p-4 max-h-80 overflow-auto font-mono text-sm space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      log.level === 'ERROR'
                        ? 'text-red-500'
                        : log.level === 'WARN'
                        ? 'text-yellow-500'
                        : 'text-muted-foreground'
                    }
                  >
                    [{log.level}]
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config */}
      {config && (
        <Card id="settings">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Server ID</span>
                <span className="font-mono">{config.serverId}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Port</span>
                <span className="font-mono">{config.port}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Max Connections</span>
                <span className="font-mono">{config.maxConnections}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Compression</span>
                <Badge variant={config.compression ? 'success' : 'secondary'}>
                  {config.compression ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Encryption</span>
                <Badge variant={config.encryption ? 'success' : 'secondary'}>
                  {config.encryption ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Checks */}
      {healthChecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthChecks.map((check, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {check.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : check.status === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{check.name}</div>
                      <div className="text-sm text-muted-foreground">{check.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{check.responseTime}ms</span>
                    <Badge className={statusColors[check.status]}>{check.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
