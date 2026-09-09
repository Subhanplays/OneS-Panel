import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatBytes } from '@/lib/utils';
import { Cpu, MemoryStick, HardDrive, Activity } from 'lucide-react';

interface MetricsData {
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

interface MetricsChartProps {
  metrics: MetricsData | null;
  loading?: boolean;
}

export function MetricsChart({ metrics, loading }: MetricsChartProps) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-20 bg-secondary rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">CPU</p>
              <p className="text-2xl font-bold">{metrics.cpu.toFixed(1)}%</p>
            </div>
            <Cpu className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Memory</p>
              <p className="text-2xl font-bold">{formatBytes(metrics.ramUsed)}</p>
            </div>
            <MemoryStick className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatBytes(metrics.ramUsed)} used</span>
              <span>{formatBytes(metrics.ramTotal)} total</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((metrics.ramUsed / metrics.ramTotal) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disk</p>
              <p className="text-2xl font-bold">{formatBytes(metrics.diskUsed)}</p>
            </div>
            <HardDrive className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatBytes(metrics.diskUsed)} used</span>
              <span>{formatBytes(metrics.diskTotal)} total</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(metrics.disk, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-2xl font-bold">{formatUptime(metrics.uptime)}</p>
            </div>
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {metrics.pid ? `PID: ${metrics.pid}` : 'Not running'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
