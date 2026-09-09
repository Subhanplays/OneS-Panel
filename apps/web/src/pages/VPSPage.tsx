import React, { useEffect, useState } from 'react';
import { vpsApi, VPSInstance, VPSStats, CreateVPSParams } from '@/lib/api';
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
  Activity,
  HardDrive,
  Cpu,
  Clock,
  Shield,
  AlertTriangle,
  Plus,
  Settings,
  Copy,
  Check,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  stopped: 'bg-red-500/10 text-red-500 border-red-500/20',
  suspended: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  creating: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  running: 'Running',
  stopped: 'Stopped',
  suspended: 'Suspended',
  creating: 'Creating',
  error: 'Error',
};

export function VPSPage() {
  const [instances, setInstances] = useState<VPSInstance[]>([]);
  const [stats, setStats] = useState<VPSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateVPSParams>({
    memory: 1,
    cpu: 1,
    disk: 10,
    ownerId: '',
    osImage: 'ubuntu:22.04',
    useCustomImage: true,
  });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchInstances = async () => {
    try {
      const response = await vpsApi.list();
      setInstances(response.data);
    } catch (err) {
      console.error('Failed to fetch VPS instances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await vpsApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch VPS stats:', err);
    }
  };

  useEffect(() => {
    fetchInstances();
    fetchStats();
  }, []);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'delete' | 'suspend' | 'unsuspend') => {
    setActionLoading(id);
    try {
      await vpsApi[action](id);
      await fetchInstances();
      await fetchStats();
    } catch (err) {
      console.error(`Failed to ${action} VPS:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    try {
      await vpsApi.create(createForm);
      setShowCreateModal(false);
      setCreateForm({
        memory: 1,
        cpu: 1,
        disk: 10,
        ownerId: '',
        osImage: 'ubuntu:22.04',
        useCustomImage: true,
      });
      await fetchInstances();
      await fetchStats();
    } catch (err) {
      console.error('Failed to create VPS:', err);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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
          <h1 className="text-3xl font-bold">VPS Management</h1>
          <p className="text-muted-foreground">Manage your virtual private servers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchInstances} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create VPS
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total VPS</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.running} running, {stats.stopped} stopped
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.totalMemory / 1024).toFixed(1)} GB</div>
              <p className="text-xs text-muted-foreground">Memory allocated</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disk</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.totalDisk / 1024).toFixed(1)} GB</div>
              <p className="text-xs text-muted-foreground">Disk allocated</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspended}</div>
              <p className="text-xs text-muted-foreground">Suspended instances</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VPS Instances */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({instances.length})</TabsTrigger>
          <TabsTrigger value="running">
            Running ({instances.filter(i => i.status === 'running').length})
          </TabsTrigger>
          <TabsTrigger value="stopped">
            Stopped ({instances.filter(i => i.status === 'stopped').length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({instances.filter(i => i.status === 'suspended').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No VPS instances found</p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First VPS
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {instances.map((instance) => (
                <VPSCard
                  key={instance.token}
                  instance={instance}
                  onAction={handleAction}
                  onCopyToken={handleCopyToken}
                  copiedToken={copiedToken}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances
              .filter((i) => i.status === 'running')
              .map((instance) => (
                <VPSCard
                  key={instance.token}
                  instance={instance}
                  onAction={handleAction}
                  onCopyToken={handleCopyToken}
                  copiedToken={copiedToken}
                  actionLoading={actionLoading}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="stopped" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances
              .filter((i) => i.status === 'stopped')
              .map((instance) => (
                <VPSCard
                  key={instance.token}
                  instance={instance}
                  onAction={handleAction}
                  onCopyToken={handleCopyToken}
                  copiedToken={copiedToken}
                  actionLoading={actionLoading}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances
              .filter((i) => i.status === 'suspended')
              .map((instance) => (
                <VPSCard
                  key={instance.token}
                  instance={instance}
                  onAction={handleAction}
                  onCopyToken={handleCopyToken}
                  copiedToken={copiedToken}
                  actionLoading={actionLoading}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create VPS Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New VPS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Memory (GB)</label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={createForm.memory}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, memory: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CPU Cores</label>
                <Input
                  type="number"
                  min={1}
                  max={32}
                  value={createForm.cpu}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, cpu: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Disk (GB)</label>
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  value={createForm.disk}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, disk: parseInt(e.target.value) || 10 })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">OS Image</label>
                <Input
                  value={createForm.osImage}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, osImage: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomImage"
                  checked={createForm.useCustomImage}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, useCustomImage: e.target.checked })
                  }
                />
                <label htmlFor="useCustomImage" className="text-sm font-medium">
                  Use Custom Image (Recommended)
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create VPS</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function VPSCard({
  instance,
  onAction,
  onCopyToken,
  copiedToken,
  actionLoading,
}: {
  instance: VPSInstance;
  onAction: (id: string, action: 'start' | 'stop' | 'restart' | 'delete' | 'suspend' | 'unsuspend') => void;
  onCopyToken: (token: string) => void;
  copiedToken: string | null;
  actionLoading: string | null;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{instance.vpsId}</CardTitle>
              <p className="text-sm text-muted-foreground">{instance.osImage}</p>
            </div>
          </div>
          <Badge className={statusColors[instance.status]}>
            {statusLabels[instance.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>RAM: {instance.memory}GB</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span>CPU: {instance.cpu} cores</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>Disk: {instance.disk}GB</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Restarts: {instance.restartCount}</span>
          </div>
        </div>

        <div className="mb-4 text-sm">
          <div className="text-muted-foreground">Access Token:</div>
          <div className="flex items-center gap-2 mt-1">
            <code className="bg-muted px-2 py-1 rounded text-xs flex-1 overflow-hidden text-ellipsis">
              {instance.token}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopyToken(instance.token)}
            >
              {copiedToken === instance.token ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {instance.status === 'stopped' && (
            <Button
              size="sm"
              onClick={() => onAction(instance.vpsId, 'start')}
              disabled={actionLoading === instance.vpsId}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          {instance.status === 'running' && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction(instance.vpsId, 'stop')}
                disabled={actionLoading === instance.vpsId}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(instance.vpsId, 'restart')}
                disabled={actionLoading === instance.vpsId}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </>
          )}
          {instance.status === 'suspended' && (
            <Button
              size="sm"
              onClick={() => onAction(instance.vpsId, 'unsuspend')}
              disabled={actionLoading === instance.vpsId}
            >
              <Play className="h-4 w-4 mr-2" />
              Unsuspend
            </Button>
          )}
          {instance.status !== 'suspended' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(instance.vpsId, 'suspend')}
              disabled={actionLoading === instance.vpsId}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Suspend
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(instance.vpsId, 'delete')}
            disabled={actionLoading === instance.vpsId}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
