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
  Download,
  Play,
  Square,
  RotateCcw,
  ArrowUpCircle,
  FileText,
  Megaphone,
  BarChart3,
  Users,
  MessageSquare,
  Send,
  X,
  Check,
  Clock,
  Cpu,
  MemoryStick,
  Wifi,
  WifiOff,
  Heart,
  Bell,
  Zap,
  Settings2,
  Edit,
  Eye,
} from 'lucide-react';

interface DiscordBot {
  id: string;
  name: string;
  token: string;
  guildId: string | null;
  applicationId: string | null;
  enabled: boolean;
  features: string[];
  config: Record<string, any>;
  status: string;
  uptime: number;
  cpu: number;
  ram: number;
  lastHeartbeat: string | null;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  channel: string;
  embed: any;
  sentAt: string | null;
  status: 'draft' | 'sent' | 'scheduled';
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  sentCount: number;
  totalTargets: number;
  createdAt: string;
}

interface BotAnalytics {
  totalMembers: number;
  totalMessages: number;
  totalCommands: number;
  totalTickets: number;
  membersJoined: number;
  membersLeft: number;
}

interface BotSettings {
  welcomeChannel: string;
  welcomeMessage: string;
  welcomeDM: boolean;
  autoRole: string;
  logChannel: string;
  commandPrefix: string;
  statusMessage: string;
  statusType: string;
}

export function HostingOpsBotPage() {
  const [bots, setBots] = useState<DiscordBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', token: '', guildId: '' });
  const [selectedBot, setSelectedBot] = useState<DiscordBot | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'welcome' | 'announcements' | 'campaigns' | 'analytics' | 'settings'>('overview');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings>({
    welcomeChannel: '',
    welcomeMessage: 'Welcome to the server!',
    welcomeDM: false,
    autoRole: '',
    logChannel: '',
    commandPrefix: '!',
    statusMessage: 'Managing hosting',
    statusType: 'online',
  });
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', channel: '' });

  useEffect(() => {
    fetchBots();
  }, []);

  useEffect(() => {
    if (selectedBot) {
      fetchBotData(selectedBot.id);
    }
  }, [selectedBot]);

  const fetchBots = async () => {
    try {
      const response = await api.get('/bots');
      const allBots = response.data.data || response.data || [];
      setBots(allBots.filter((b: DiscordBot) => b.features?.includes('hosting-ops')));
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBotData = async (botId: string) => {
    try {
      const [annRes, campRes, analyticsRes, settingsRes] = await Promise.allSettled([
        api.get(`/bots/${botId}/announcements`),
        api.get(`/bots/${botId}/campaigns`),
        api.get(`/bots/${botId}/analytics`),
        api.get(`/bots/${botId}/settings`),
      ]);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data.data || []);
      if (campRes.status === 'fulfilled') setCampaigns(campRes.value.data.data || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data || null);
      if (settingsRes.status === 'fulfilled') setBotSettings((prev) => ({ ...prev, ...settingsRes.value.data.data }));
    } catch (err) {
      console.error('Failed to fetch bot data:', err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.post(`/bots/${id}/toggle`);
      await fetchBots();
    } catch (err) {
      console.error('Failed to toggle bot:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bot? This cannot be undone.')) return;
    try {
      await api.delete(`/bots/${id}`);
      if (selectedBot?.id === id) setSelectedBot(null);
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
        features: ['hosting-ops'],
      });
      setShowCreate(false);
      setCreateForm({ name: '', token: '', guildId: '' });
      await fetchBots();
    } catch (err) {
      console.error('Failed to create bot:', err);
    }
  };

  const handleLifecycleAction = async (action: string, botId: string) => {
    try {
      await api.post(`/bots/${botId}/${action}`);
      await fetchBots();
    } catch (err) {
      console.error(`Failed to ${action} bot:`, err);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!selectedBot) return;
    try {
      await api.post(`/bots/${selectedBot.id}/announcements`, announcementForm);
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', content: '', channel: '' });
      await fetchBotData(selectedBot.id);
    } catch (err) {
      console.error('Failed to send announcement:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedBot) return;
    try {
      await api.put(`/bots/${selectedBot.id}/settings`, botSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
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
          <h1 className="text-3xl font-bold">Hosting Ops Bot</h1>
          <p className="text-muted-foreground">Manage your hosting operations Discord bot</p>
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
            <p className="text-muted-foreground mb-4">No Hosting Ops Bots configured</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Bot
            </Button>
          </CardContent>
        </Card>
      ) : !selectedBot ? (
        <div className="grid gap-4 md:grid-cols-2">
          {bots.map((bot) => (
            <Card key={bot.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedBot(bot)}>
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
                  <Badge variant={bot.enabled ? 'success' : 'secondary'}>
                    {bot.enabled ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token:</span>
                    <span className="font-mono text-xs">{bot.token.slice(0, 10)}...{bot.token.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(bot.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant={bot.enabled ? 'destructive' : 'default'} onClick={() => handleToggle(bot.id)}>
                    {bot.enabled ? <PowerOff className="h-4 w-4 mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                    {bot.enabled ? 'Stop' : 'Start'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedBot(bot)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(bot.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Bot Status Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedBot.name}</h2>
                      <Badge variant={selectedBot.enabled ? 'success' : 'secondary'}>
                        {selectedBot.enabled ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Uptime: {formatUptime(selectedBot.uptime || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5" />
                        CPU: {(selectedBot.cpu || 0).toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <MemoryStick className="h-3.5 w-3.5" />
                        RAM: {(selectedBot.ram || 0).toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1">
                        {selectedBot.enabled ? (
                          <Wifi className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 text-red-500" />
                        )}
                        Discord: {selectedBot.enabled ? 'Connected' : 'Disconnected'}
                      </span>
                      {selectedBot.lastHeartbeat && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          Heartbeat: {new Date(selectedBot.lastHeartbeat).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedBot(null)}>
                    Back to List
                  </Button>
                </div>
              </div>

              {/* Lifecycle Buttons */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {!selectedBot.enabled ? (
                  <Button size="sm" onClick={() => handleLifecycleAction('install', selectedBot.id)}>
                    <Download className="h-4 w-4 mr-1" /> Install
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => handleLifecycleAction('stop', selectedBot.id)}>
                      <Square className="h-4 w-4 mr-1" /> Stop
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleLifecycleAction('restart', selectedBot.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Restart
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleLifecycleAction('update', selectedBot.id)}>
                      <ArrowUpCircle className="h-4 w-4 mr-1" /> Update
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleLifecycleAction('logs', selectedBot.id)}>
                      <FileText className="h-4 w-4 mr-1" /> Logs
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedBot.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Uninstall
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            {[
              { key: 'overview', label: 'Overview', icon: Eye },
              { key: 'welcome', label: 'Welcome Config', icon: Bell },
              { key: 'announcements', label: 'Announcements', icon: Megaphone },
              { key: 'campaigns', label: 'Campaigns', icon: Send },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'settings', label: 'Settings', icon: Settings2 },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeTab === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(key as any)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">CPU Usage</p>
                        <p className="text-3xl font-bold">{(selectedBot.cpu || 0).toFixed(1)}%</p>
                      </div>
                      <Cpu className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">RAM Usage</p>
                        <p className="text-3xl font-bold">{(selectedBot.ram || 0).toFixed(1)}%</p>
                      </div>
                      <MemoryStick className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                        <p className="text-3xl font-bold">{formatUptime(selectedBot.uptime || 0)}</p>
                      </div>
                      <Clock className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-3xl font-bold">{selectedBot.enabled ? 'Online' : 'Offline'}</p>
                      </div>
                      {selectedBot.enabled ? (
                        <Wifi className="h-8 w-8 text-green-500" />
                      ) : (
                        <WifiOff className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(selectedBot.config?.recentActivity || []).slice(0, 5).map((activity: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Zap className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm font-medium">{activity.action}</div>
                            <div className="text-xs text-muted-foreground">{activity.user}</div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                    {(!selectedBot.config?.recentActivity || selectedBot.config.recentActivity.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Welcome Config Tab */}
          {activeTab === 'welcome' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Configuration</CardTitle>
                  <CardDescription>Configure welcome messages and auto-roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Welcome Channel ID</label>
                    <Input
                      value={botSettings.welcomeChannel}
                      onChange={(e) => setBotSettings({ ...botSettings, welcomeChannel: e.target.value })}
                      className="mt-1"
                      placeholder="Enter channel ID"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Welcome Message</label>
                    <textarea
                      value={botSettings.welcomeMessage}
                      onChange={(e) => setBotSettings({ ...botSettings, welcomeMessage: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px]"
                      placeholder="Welcome {user} to {server}!"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Auto-Role ID</label>
                    <Input
                      value={botSettings.autoRole}
                      onChange={(e) => setBotSettings({ ...botSettings, autoRole: e.target.value })}
                      className="mt-1"
                      placeholder="Enter role ID"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={botSettings.welcomeDM}
                      onChange={(e) => setBotSettings({ ...botSettings, welcomeDM: e.target.checked })}
                      id="welcomeDM"
                    />
                    <label htmlFor="welcomeDM" className="text-sm font-medium">Send Welcome DM</label>
                  </div>
                  <Button onClick={handleSaveSettings}>Save Welcome Config</Button>
                </CardContent>
              </Card>

              {/* Embed Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Embed Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#2f3136] rounded-lg p-4 max-w-md">
                    <div className="flex">
                      <div className="w-1 rounded-l-md bg-primary flex-shrink-0" />
                      <div className="flex-1 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-primary/50" />
                          <span className="text-xs font-semibold text-white">Bot Name</span>
                        </div>
                        <div className="font-semibold text-white mb-1">Welcome!</div>
                        <p className="text-sm text-gray-300">
                          {botSettings.welcomeMessage || 'Welcome to the server!'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={() => setShowAnnouncementModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                  {announcements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No announcements yet</div>
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <div className="font-medium">{ann.title}</div>
                            <div className="text-sm text-muted-foreground">{ann.content}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={ann.status === 'sent' ? 'success' : 'secondary'}>
                                {ann.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Channel: {ann.channel}
                              </span>
                              {ann.sentAt && (
                                <span className="text-xs text-muted-foreground">
                                  Sent: {new Date(ann.sentAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No campaigns yet</div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.map((camp) => (
                        <div key={camp.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <div className="font-medium">{camp.name}</div>
                            <div className="text-sm text-muted-foreground">{camp.type} • {camp.target}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={
                                camp.status === 'completed' ? 'success' :
                                camp.status === 'running' ? 'default' :
                                camp.status === 'cancelled' ? 'destructive' : 'secondary'
                              }>
                                {camp.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {camp.sentCount}/{camp.totalTargets} sent
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {camp.status === 'pending' && (
                              <Button size="sm" variant="outline"><Play className="h-4 w-4 mr-1" /> Start</Button>
                            )}
                            {camp.status === 'running' && (
                              <Button size="sm" variant="destructive"><Square className="h-4 w-4 mr-1" /> Cancel</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Members</p>
                        <p className="text-3xl font-bold">{analytics?.totalMembers?.toLocaleString() || '0'}</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Messages</p>
                        <p className="text-3xl font-bold">{analytics?.totalMessages?.toLocaleString() || '0'}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Commands Used</p>
                        <p className="text-3xl font-bold">{analytics?.totalCommands?.toLocaleString() || '0'}</p>
                      </div>
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Tickets</p>
                        <p className="text-3xl font-bold">{analytics?.totalTickets?.toLocaleString() || '0'}</p>
                      </div>
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-500">+{analytics?.membersJoined || 0}</p>
                      <p className="text-sm text-muted-foreground">Members Joined</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-red-500">-{analytics?.membersLeft || 0}</p>
                      <p className="text-sm text-muted-foreground">Members Left</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bot Settings</CardTitle>
                  <CardDescription>Configure all bot behavior options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Command Prefix</label>
                    <Input
                      value={botSettings.commandPrefix}
                      onChange={(e) => setBotSettings({ ...botSettings, commandPrefix: e.target.value })}
                      className="mt-1"
                      placeholder="!"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status Message</label>
                    <Input
                      value={botSettings.statusMessage}
                      onChange={(e) => setBotSettings({ ...botSettings, statusMessage: e.target.value })}
                      className="mt-1"
                      placeholder="Managing hosting"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status Type</label>
                    <select
                      value={botSettings.statusType}
                      onChange={(e) => setBotSettings({ ...botSettings, statusType: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="online">Online</option>
                      <option value="idle">Idle</option>
                      <option value="dnd">Do Not Disturb</option>
                      <option value="streaming">Streaming</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Log Channel ID</label>
                    <Input
                      value={botSettings.logChannel}
                      onChange={(e) => setBotSettings({ ...botSettings, logChannel: e.target.value })}
                      className="mt-1"
                      placeholder="Enter channel ID"
                    />
                  </div>
                  <Button onClick={handleSaveSettings}>Save Settings</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Create Bot Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Hosting Ops Bot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bot Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="mt-1"
                  placeholder="My Hosting Bot"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bot Token</label>
                <Input
                  type="password"
                  value={createForm.token}
                  onChange={(e) => setCreateForm({ ...createForm, token: e.target.value })}
                  className="mt-1"
                  placeholder="Enter bot token"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Guild ID (Optional)</label>
                <Input
                  value={createForm.guildId}
                  onChange={(e) => setCreateForm({ ...createForm, guildId: e.target.value })}
                  className="mt-1"
                  placeholder="Enter guild ID"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Bot</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Announcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="mt-1"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[100px]"
                  placeholder="Announcement content..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Channel ID</label>
                <Input
                  value={announcementForm.channel}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, channel: e.target.value })}
                  className="mt-1"
                  placeholder="Enter channel ID"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAnnouncementModal(false)}>Cancel</Button>
                <Button onClick={handleSendAnnouncement}>Send Announcement</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
