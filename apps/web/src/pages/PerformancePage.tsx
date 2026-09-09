import React, { useEffect, useState } from 'react';
import { performanceApi, SystemMetrics, MetricDataPoint } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  RefreshCw,
  Clock,
} from 'lucide-react';

export function PerformancePage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    fetchHistory();
  }, [period]);

  const fetchData = async () => {
    try {
      const response = await performanceApi.getCurrent();
      setMetrics(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await performanceApi.getHistory(period);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const chartData = history
    .filter((m) => m.source === 'system')
    .reduce((acc, m) => {
      const time = new Date(m.timestamp).getTime();
      const existing = acc.find((a) => a.time === time);
      if (existing) {
        existing[m.metric] = m.value;
      } else {
        acc.push({ time, [m.metric]: m.value });
      }
      return acc;
    }, [] as any[])
    .slice(-50);

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
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Real-time system metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <p className="text-3xl font-bold">{metrics.cpu.usage}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.cpu.cores} cores • {metrics.cpu.model}
                  </p>
                </div>
                <Cpu className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${metrics.cpu.usage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="text-3xl font-bold">{metrics.memory.percentage}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                  </p>
                </div>
                <MemoryStick className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${metrics.memory.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disk</p>
                  <p className="text-3xl font-bold">{metrics.disk.percentage}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
                  </p>
                </div>
                <HardDrive className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${metrics.disk.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Network</p>
                  <p className="text-3xl font-bold">
                    {formatBytes(metrics.network.rx)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    RX / TX: {formatBytes(metrics.network.tx)}
                  </p>
                </div>
                <Network className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Load Average</p>
                  <p className="font-medium">
                    {metrics.cpu.loadAverage.map((l) => l.toFixed(2)).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-medium">{formatUptime(metrics.uptime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Cpu className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Hostname</p>
                  <p className="font-medium">{metrics.hostname}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Metrics History</CardTitle>
            <div className="flex gap-2">
              {['1h', '6h', '24h', '7d', '30d'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No historical data available
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
                  <Line type="monotone" dataKey="disk" stroke="#f59e0b" dot={false} name="Disk" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
