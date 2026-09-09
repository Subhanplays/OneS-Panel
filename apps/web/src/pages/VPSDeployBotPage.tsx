import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Bot,
  RefreshCw,
  Power,
  PowerOff,
  Settings,
  Trash2,
  Plus,
  Activity,
  HardDrive,
  Clock,
  Wifi,
  WifiOff,
  Play,
  Square,
  RotateCw,
  Download,
  FileText,
  ArrowUp,
} from 'lucide-react';

interface DiscordBot {
  id: string;
  name: string;
  token: string;
  guildId: string | null;
  applicationId: string | null;
  enabled: boolean;
  features: string[];
  config: Record<string, unknown>;
  createdAt: string;
}

interface BotStatus {
  status: string;
  uptime: number;
  cpu: number;
  ram: number;
  disk: number;
  lastHeartbeat: string;
}

export function VPSDeployBotPage() {
  const [bots, setBots] = useState<DiscordBot[]>([]);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', token: '', guildId: '' });

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await api.get('/bots');
      const botList = response.data.data.filter((b: DiscordBot) => b.features.includes('vps-deploy'));
      setBots(botList);

      // Fetch status for each bot
      for (const bot of botList) {
        try {
          const statusRes = await api.get(`/applications/${bot.applicationId}`);
          if (statusRes.data) {
            setBotStatuses(prev => ({
              ...prev,
              [bot.id]: {
                status: statusRes.data.status,
                uptime: statusRes.data.lastStartedAt ? Date.now() - new Date(statusRes.data.lastStartedAt).getTime() : 0,
                cpu: statusRes.data.cpuUsage || 0,
                ram: statusRes.data.ramUsage || 0,
                disk: statusRes.data.diskUsage || 0,
                lastHeartbeat: statusRes.data.updatedAt,
              },
            }));
          }
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (appId: string, action: string) => {
    setActionLoading(appId);
    try {
      await api.post(`/applications/${appId}/${action}`);
      await fetchBots();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string, appId: string) => {
    setActionLoading(id);
    try {
      await api.post(`/bots/${id}/toggle`);
      await fetchBots();
    } catch (err) {
      console.error('Failed to toggle bot:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bot?')) return;
    try {
      await api.delete(`/bots/${id}`);
      await fetchBots();
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/bots', {
        name: createForm.name,
        token: createForm.token,
        guildId: createForm.guildId,
        features: ['vps-deploy'],
      });
      setShowCreate(false);
      setCreateForm({ name: '', token: '', guildId: '' });
      await fetchBots();
    } catch (err) {
      console.error('Failed to create bot:', err);
    }
  };

  const formatUptime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${d}d ${h}h ${m}m`;
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
          <h1 className="text-3xl font-bold">VPS Deploy Bot</h1>
          <p className="text-muted-foreground">Manage your VPS deployment Discord bot</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBots} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>
        </div>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No VPS Deploy Bots configured</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Bot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bots.map((bot) => {
            const status = botStatuses[bot.id];
            return (
              <Card key={bot.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bot.name}</CardTitle>
                        <CardDescription>
                          {bot.guildId ? `Guild: ${bot.guildId}` : 'No guild configured'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={bot.enabled ? 'success' : 'secondary'}>
                        {bot.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant={status?.status === 'RUNNING' ? 'success' : status?.status === 'ERROR' ? 'error' : 'secondary'}>
                        {status?.status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Resource Monitoring */}
                  {status && (
                    <div className="grid grid-cols-4 gap-4 mb-4 p-4 rounded-lg bg-muted/50">
                      <div className="text-center">
                        <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">{status.cpu.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">CPU</div>
                      </div>
                      <div className="text-center">
                        <HardDrive className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">{(status.ram / 1024 / 1024).toFixed(1)} MB</div>
                        <div className="text-xs text-muted-foreground">RAM</div>
                      </div>
                      <div className="text-center">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">{formatUptime(status.uptime)}</div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                      <div className="text-center">
                        {status.status === 'RUNNING' ? (
                          <Wifi className="h-4 w-4 mx-auto mb-1 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 mx-auto mb-1 text-red-500" />
                        )}
                        <div className="text-sm font-medium">{status.status === 'RUNNING' ? 'Connected' : 'Disconnected'}</div>
                        <div className="text-xs text-muted-foreground">Discord</div>
                      </div>
                    </div>
                  )}

                  {/* Bot Info */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Token: </span>
                      <span className="font-mono text-xs">{bot.token.slice(0, 10)}...{bot.token.slice(-4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Features: </span>
                      <span>{bot.features.join(', ') || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span>{new Date(bot.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Heartbeat: </span>
                      <span>{status?.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Lifecycle Actions */}
                  <div className="flex flex-wrap gap-2">
                    {status?.status === 'NOT_INSTALLED' && (
                      <Button size="sm" onClick={() => handleAction(bot.applicationId || '', 'install')} disabled={actionLoading === bot.id}>
                        <Download className="h-4 w-4 mr-2" /> Install
                      </Button>
                    )}
                    {status?.status === 'STOPPED' && (
                      <Button size="sm" onClick={() => handleAction(bot.applicationId || '', 'start')} disabled={actionLoading === bot.id}>
                        <Play className="h-4 w-4 mr-2" /> Start
                      </Button>
                    )}
                    {status?.status === 'RUNNING' && (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(bot.applicationId || '', 'stop')} disabled={actionLoading === bot.id}>
                          <Square className="h-4 w-4 mr-2" /> Stop
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(bot.applicationId || '', 'restart')} disabled={actionLoading === bot.id}>
                          <RotateCw className="h-4 w-4 mr-2" /> Restart
                        </Button>
                      </>
                    )}
                    {(status?.status === 'RUNNING' || status?.status === 'STOPPED') && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(bot.applicationId || '', 'update')} disabled={actionLoading === bot.id}>
                        <ArrowUp className="h-4 w-4 mr-2" /> Update
                      </Button>
                    )}
                    {status?.status !== 'NOT_INSTALLED' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleAction(bot.applicationId || '', 'logs')}>
                          <FileText className="h-4 w-4 mr-2" /> Logs
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Activity className="h-4 w-4 mr-2" /> Performance
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant={bot.enabled ? 'destructive' : 'default'}
                      onClick={() => handleToggle(bot.id, bot.applicationId || '')}
                      disabled={actionLoading === bot.id}
                    >
                      {bot.enabled ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                      {bot.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    {status?.status !== 'NOT_INSTALLED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Uninstall this bot? This cannot be undone.')) {
                            handleAction(bot.applicationId || '', 'uninstall');
                          }
                        }}
                        disabled={actionLoading === bot.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add VPS Deploy Bot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bot Name</label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="mt-1" placeholder="My VPS Bot" />
              </div>
              <div>
                <label className="text-sm font-medium">Bot Token</label>
                <Input type="password" value={createForm.token} onChange={(e) => setCreateForm({ ...createForm, token: e.target.value })} className="mt-1" placeholder="Enter bot token" />
              </div>
              <div>
                <label className="text-sm font-medium">Guild ID (Optional)</label>
                <Input value={createForm.guildId} onChange={(e) => setCreateForm({ ...createForm, guildId: e.target.value })} className="mt-1" placeholder="Enter guild ID" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Bot</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
