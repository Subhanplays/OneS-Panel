import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Send,
  RefreshCw,
  Trash2,
  Plus,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  StopCircle,
  AlertTriangle,
  Hash,
} from 'lucide-react';

interface Broadcast {
  id: string;
  content: string;
  channelName: string;
  channelId: string;
  botName: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentCount: number;
  failedCount: number;
  rateLimit: number;
  createdAt: string;
  completedAt: string | null;
}

interface BroadcastBot {
  id: string;
  name: string;
  token: string;
}

interface BroadcastStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  sending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  sent: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [bots, setBots] = useState<BroadcastBot[]>([]);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    botId: '',
    channelId: '',
    content: '',
    rateLimit: 5,
  });

  const fetchData = async () => {
    try {
      const [broadcastsRes, botsRes, statsRes] = await Promise.all([
        api.get('/broadcasts'),
        api.get('/broadcasts/bots'),
        api.get('/broadcasts/stats'),
      ]);
      setBroadcasts(broadcastsRes.data);
      setBots(botsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/broadcasts', createForm);
      setShowCreateModal(false);
      setCreateForm({ botId: '', channelId: '', content: '', rateLimit: 5 });
      await fetchData();
    } catch (err) {
      console.error('Failed to create broadcast:', err);
    }
  };

  const handleAction = async (id: string, action: 'send' | 'cancel' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this broadcast?')) return;
    if (action === 'cancel' && !confirm('Are you sure you want to cancel this broadcast?')) return;
    setActionLoading(id);
    try {
      await api.post(`/broadcasts/${id}/${action}`);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} broadcast:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
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
          <h1 className="text-3xl font-bold">Broadcasts</h1>
          <p className="text-muted-foreground">Send mass messages across Discord channels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Broadcast
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Broadcast List */}
      {broadcasts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No broadcasts found</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Broadcast
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={statusColors[broadcast.status]}>
                        {statusLabels[broadcast.status]}
                      </Badge>
                      <Badge variant="outline">
                        <Hash className="h-3 w-3 mr-1" />
                        {broadcast.channelName || broadcast.channelId}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        via {broadcast.botName}
                      </span>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 mb-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {truncateContent(broadcast.content)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {broadcast.sentCount} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        {broadcast.failedCount} failed
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        {broadcast.rateLimit}/s
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(broadcast.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {broadcast.status === 'sending' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>
                            {broadcast.sentCount} / {broadcast.sentCount + broadcast.failedCount}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary animate-pulse transition-all" style={{ width: '60%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {(broadcast.status === 'pending' || broadcast.status === 'failed') && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(broadcast.id, 'send')}
                        disabled={actionLoading === broadcast.id}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    )}
                    {broadcast.status === 'sending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(broadcast.id, 'cancel')}
                        disabled={actionLoading === broadcast.id}
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(broadcast.id, 'delete')}
                      disabled={actionLoading === broadcast.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create Broadcast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bot</label>
                <select
                  value={createForm.botId}
                  onChange={(e) => setCreateForm({ ...createForm, botId: e.target.value })}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select a bot</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Channel ID</label>
                <Input
                  value={createForm.channelId}
                  onChange={(e) => setCreateForm({ ...createForm, channelId: e.target.value })}
                  placeholder="1234567890123456789"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  placeholder="Enter your broadcast message here..."
                  className="w-full mt-1 h-32 px-3 py-2 border rounded-md bg-background text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rate Limit (messages per second)</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={createForm.rateLimit}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, rateLimit: parseInt(e.target.value) || 5 })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Broadcast</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
