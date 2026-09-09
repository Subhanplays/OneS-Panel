import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Server,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Users,
  Cpu,
  HardDrive,
  Clock,
  Plus,
  Globe,
  Wifi,
  WifiOff,
  Gamepad2,
} from 'lucide-react';

interface MinecraftServer {
  id: string;
  name: string;
  software: string;
  version: string;
  port: number;
  status: 'running' | 'stopped' | 'starting' | 'error';
  players: { online: number; max: number };
  cpu: number;
  ram: { used: number; allocated: number };
  disk: number;
  uptime: number;
  nodeId: string;
}

interface MinecraftNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline';
  serverCount: number;
  memory: { used: number; total: number };
}

interface MinecraftStats {
  totalServers: number;
  running: number;
  offline: number;
  onlinePlayers: number;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  stopped: 'bg-red-500/10 text-red-500 border-red-500/20',
  starting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  running: 'Running',
  stopped: 'Stopped',
  starting: 'Starting',
  error: 'Error',
};

export function MinecraftPage() {
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [nodes, setNodes] = useState<MinecraftNode[]>([]);
  const [stats, setStats] = useState<MinecraftStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    software: 'paper',
    version: '1.20.4',
    port: 25565,
    maxPlayers: 20,
    nodeId: '',
  });
  const [createNodeForm, setCreateNodeForm] = useState({
    name: '',
    host: '',
    port: 25565,
  });

  const fetchData = async () => {
    try {
      const [serversRes, nodesRes, statsRes] = await Promise.all([
        api.get('/minecraft/servers'),
        api.get('/minecraft/nodes'),
        api.get('/minecraft/stats'),
      ]);
      setServers(serversRes.data);
      setNodes(nodesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch Minecraft data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this server?')) return;
    setActionLoading(id);
    try {
      await api.post(`/minecraft/servers/${id}/${action}`);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} server:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/minecraft/servers', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', software: 'paper', version: '1.20.4', port: 25565, maxPlayers: 20, nodeId: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to create server:', err);
    }
  };

  const handleCreateNode = async () => {
    try {
      await api.post('/minecraft/nodes', createNodeForm);
      setShowCreateNodeModal(false);
      setCreateNodeForm({ name: '', host: '', port: 25565 });
      await fetchData();
    } catch (err) {
      console.error('Failed to create node:', err);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatRam = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
    return `${mb}MB`;
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
          <h1 className="text-3xl font-bold">Minecraft Servers</h1>
          <p className="text-muted-foreground">Manage your Minecraft server infrastructure</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Server
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServers}</div>
              <p className="text-xs text-muted-foreground">
                Across {nodes.length} nodes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.running}</div>
              <p className="text-xs text-muted-foreground">Servers online</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <WifiOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.offline}</div>
              <p className="text-xs text-muted-foreground">Servers offline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onlinePlayers}</div>
              <p className="text-xs text-muted-foreground">Players connected</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Servers */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({servers.length})</TabsTrigger>
          <TabsTrigger value="running">
            Running ({servers.filter((s) => s.status === 'running').length})
          </TabsTrigger>
          <TabsTrigger value="stopped">
            Offline ({servers.filter((s) => s.status === 'stopped').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {servers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No Minecraft servers found</p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Server
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatUptime={formatUptime}
                  formatRam={formatRam}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers
              .filter((s) => s.status === 'running')
              .map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatUptime={formatUptime}
                  formatRam={formatRam}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="stopped" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers
              .filter((s) => s.status === 'stopped')
              .map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatUptime={formatUptime}
                  formatRam={formatRam}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Nodes Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nodes</h2>
          <p className="text-muted-foreground">Infrastructure nodes hosting servers</p>
        </div>
        <Button onClick={() => setShowCreateNodeModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Node
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <Card key={node.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{node.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{node.host}:{node.port}</p>
                </div>
              </div>
              <Badge
                className={
                  node.status === 'online'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                }
              >
                {node.status === 'online' ? 'Online' : 'Offline'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span>{node.serverCount} servers</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>{formatRam(node.memory.used)} / {formatRam(node.memory.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Minecraft Server</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Server Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="My Server"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Software</label>
                <select
                  value={createForm.software}
                  onChange={(e) => setCreateForm({ ...createForm, software: e.target.value })}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="paper">Paper</option>
                  <option value="spigot">Spigot</option>
                  <option value="purpur">Purpur</option>
                  <option value="fabric">Fabric</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Version</label>
                <Input
                  value={createForm.version}
                  onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                  placeholder="1.20.4"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    type="number"
                    value={createForm.port}
                    onChange={(e) => setCreateForm({ ...createForm, port: parseInt(e.target.value) || 25565 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Players</label>
                  <Input
                    type="number"
                    value={createForm.maxPlayers}
                    onChange={(e) => setCreateForm({ ...createForm, maxPlayers: parseInt(e.target.value) || 20 })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Node</label>
                <select
                  value={createForm.nodeId}
                  onChange={(e) => setCreateForm({ ...createForm, nodeId: e.target.value })}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select a node</option>
                  {nodes.filter((n) => n.status === 'online').map((node) => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Server</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Node Modal */}
      {showCreateNodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Node</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Node Name</label>
                <Input
                  value={createNodeForm.name}
                  onChange={(e) => setCreateNodeForm({ ...createNodeForm, name: e.target.value })}
                  placeholder="Node 1"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Host</label>
                <Input
                  value={createNodeForm.host}
                  onChange={(e) => setCreateNodeForm({ ...createNodeForm, host: e.target.value })}
                  placeholder="192.168.1.100"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={createNodeForm.port}
                  onChange={(e) => setCreateNodeForm({ ...createNodeForm, port: parseInt(e.target.value) || 25565 })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateNodeModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNode}>Create Node</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ServerCard({
  server,
  onAction,
  actionLoading,
  formatUptime,
  formatRam,
}: {
  server: MinecraftServer;
  onAction: (id: string, action: 'start' | 'stop' | 'restart' | 'delete') => void;
  actionLoading: string | null;
  formatUptime: (seconds: number) => string;
  formatRam: (mb: number) => string;
}) {
  const playerPercent = server.players.max > 0 ? (server.players.online / server.players.max) * 100 : 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{server.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {server.software} {server.version}
              </p>
            </div>
          </div>
          <Badge className={statusColors[server.status]}>
            {statusLabels[server.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>Port: {server.port}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {server.players.online}/{server.players.max}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span>CPU: {server.cpu.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>RAM: {formatRam(server.ram.used)}/{formatRam(server.ram.allocated)}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>Disk: {server.disk}MB</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Uptime: {formatUptime(server.uptime)}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Players</span>
            <span>{server.players.online}/{server.players.max}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(playerPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {server.status === 'stopped' && (
            <Button
              size="sm"
              onClick={() => onAction(server.id, 'start')}
              disabled={actionLoading === server.id}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          {server.status === 'running' && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction(server.id, 'stop')}
                disabled={actionLoading === server.id}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(server.id, 'restart')}
                disabled={actionLoading === server.id}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(server.id, 'delete')}
            disabled={actionLoading === server.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
