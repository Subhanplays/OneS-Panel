import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  BarChart3,
  Activity,
  Server,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface AnalyticsOverview {
  applications: {
    total: number;
    running: number;
    stopped: number;
  };
  vps: {
    total: number;
  };
  alerts: {
    total: number;
    unacknowledged: number;
  };
  logs: {
    last24h: number;
  };
}

interface MetricData {
  id: string;
  source: string;
  metric: string;
  value: number;
  tags: Record<string, unknown>;
  timestamp: string;
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      const [overviewRes, metricsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/metrics', { params: { period } }),
      ]);
      setOverview(overviewRes.data.data);
      setMetrics(metricsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">System analytics and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.applications.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.applications.running || 0} running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VPS Instances</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.vps.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.alerts.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.alerts.unacknowledged || 0} unacknowledged
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.logs.last24h || 0}</div>
            <p className="text-xs text-muted-foreground">Log entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Period Selector */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="1h">1 Hour</TabsTrigger>
          <TabsTrigger value="24h">24 Hours</TabsTrigger>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No metrics data available for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {metrics.slice(0, 20).map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{metric.source}</div>
                          <div className="text-sm text-muted-foreground">
                            {metric.metric}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{metric.value.toFixed(2)}%</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
