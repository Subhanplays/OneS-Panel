import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DashboardData, VPSStats, MinecraftStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Box,
  Bot,
  Globe,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  Gamepad2,
  Database,
  Wifi,
  WifiOff,
  Shield,
  Terminal,
  Hammer,
  BarChart3,
  FileText,
  Heart,
  Archive,
  Settings,
} from 'lucide-react';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [vpsStats, setVpsStats] = useState<VPSStats | null>(null);
  const [mcStats, setMcStats] = useState<MinecraftStats | null>(null);
  const [botStatus, setBotStatus] = useState<{ vpsDeploy: string; hostingOps: string }>({ vpsDeploy: 'offline', hostingOps: 'offline' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, vpsRes, mcRes, botsRes] = await Promise.allSettled([
        api.get('/dashboard'),
        api.get('/vps/stats'),
        api.get('/minecraft/stats'),
        api.get('/bots'),
      ]);

      if (dashRes.status === 'fulfilled') setData(dashRes.value.data);
      if (vpsRes.status === 'fulfilled') setVpsStats(vpsRes.value.data);
      if (mcRes.status === 'fulfilled') setMcStats(mcRes.value.data);
      if (botsRes.status === 'fulfilled') {
        const bots = botsRes.value.data.data || [];
        setBotStatus({
          vpsDeploy: bots.find((b: { features: string[] }) => b.features.includes('vps-deploy'))?.enabled ? 'online' : 'offline',
          hostingOps: bots.find((b: { features: string[] }) => b.features.includes('hosting-ops'))?.enabled ? 'online' : 'offline',
        });
      }
    } catch (err) {
      setError('Failed to load dashboard');
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

  const sys = data?.system || { cpu: 0, memory: { used: 0, total: 0, percentage: 0 }, disk: { used: 0, total: 0, percentage: 0 }, uptime: 0, loadAverage: [0, 0, 0] };
  const cpu = Number(sys.cpu) || 0;
  const memPct = Number(sys.memory?.percentage) || 0;
  const diskPct = Number(sys.disk?.percentage) || 0;
  const apps = data?.applications || { total: 0, running: 0, stopped: 0, error: 0, list: [] };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Infrastructure overview</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {/* System Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cpu.toFixed(1)}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${cpu}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memPct.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{formatBytes(sys.memory.used)} / {formatBytes(sys.memory.total)}</p>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${memPct}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diskPct.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{formatBytes(sys.disk.used)} / {formatBytes(sys.disk.total)}</p>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${diskPct}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(sys.uptime)}</div>
            <p className="text-xs text-muted-foreground">Load: {(sys.loadAverage || [0,0,0]).map((l: any) => Number(l).toFixed(2)).join(', ')}</p>
          </CardContent>
        </Card>
      </div>

      {/* VPS Infrastructure */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5" /> VPS Infrastructure
          </h2>
          <Link to="/vps">
            <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{vpsStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total VPS</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{vpsStats?.running || 0}</div>
              <p className="text-xs text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{vpsStats?.stopped || 0}</div>
              <p className="text-xs text-muted-foreground">Stopped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">{vpsStats?.suspended || 0}</div>
              <p className="text-xs text-muted-foreground">Suspended</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Minecraft Infrastructure */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" /> Minecraft Infrastructure
          </h2>
          <Link to="/minecraft">
            <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{mcStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total Servers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{mcStats?.running || 0}</div>
              <p className="text-xs text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{mcStats?.offline || 0}</div>
              <p className="text-xs text-muted-foreground">Offline</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{mcStats?.totalPlayers || 0}</div>
              <p className="text-xs text-muted-foreground">Online Players</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Applications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Box className="h-5 w-5" /> Applications
          </h2>
          <Link to="/applications">
            <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{apps.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{apps.running}</div>
              <p className="text-xs text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">{apps.stopped}</div>
              <p className="text-xs text-muted-foreground">Stopped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{apps.error}</div>
              <p className="text-xs text-muted-foreground">Error</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bots Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" /> Discord Bots
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">VPS Deploy Bot</p>
                  <p className="text-xs text-muted-foreground">VPS deployment & lifecycle</p>
                </div>
              </div>
              <Badge variant={botStatus.vpsDeploy === 'online' ? 'success' : 'secondary'}>
                {botStatus.vpsDeploy === 'online' ? (
                  <><Wifi className="h-3 w-3 mr-1" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                )}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Hosting Ops Bot</p>
                  <p className="text-xs text-muted-foreground">Community & operations</p>
                </div>
              </div>
              <Badge variant={botStatus.hostingOps === 'online' ? 'success' : 'secondary'}>
                {botStatus.hostingOps === 'online' ? (
                  <><Wifi className="h-3 w-3 mr-1" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                )}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Health */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" /> System Health
          </h2>
          <Link to="/healthchecks">
            <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { name: 'Database', status: 'healthy', icon: Database },
            { name: 'Redis', status: 'healthy', icon: Database },
            { name: 'Docker', status: 'healthy', icon: Database },
            { name: 'Worker', status: 'healthy', icon: Activity },
            { name: 'API', status: 'healthy', icon: Server },
          ].map((item) => (
            <Card key={item.name}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{item.status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {[
            { label: 'Deploy VPS', path: '/vps', icon: Server },
            { label: 'Install JTG', path: '/jtg', icon: Hammer },
            { label: 'View Minecraft', path: '/minecraft', icon: Gamepad2 },
            { label: 'View VPS', path: '/vps', icon: Server },
            { label: 'View Applications', path: '/applications', icon: Box },
            { label: 'View Analytics', path: '/analytics', icon: BarChart3 },
            { label: 'View Logs', path: '/logs', icon: FileText },
            { label: 'Health Checks', path: '/healthchecks', icon: Heart },
            { label: 'Create Backup', path: '/backups', icon: Archive },
            { label: 'Terminal', path: '/terminal', icon: Terminal },
            { label: 'Alerts', path: '/alerts', icon: AlertTriangle },
            { label: 'Settings', path: '/settings', icon: Settings },
          ].map((action) => (
            <Link key={action.path + action.label} to={action.path}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {activity.user?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>
                        {' '}{activity.action}{' '}
                        <span className="text-muted-foreground">{activity.resource}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
