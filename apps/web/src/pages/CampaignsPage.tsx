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
  Mail,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  StopCircle,
  Eye,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'sent' | 'failed' | 'scheduled' | 'sending';
  message: string;
  targetType: 'channel' | 'user';
  targetId: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  scheduledAt: string | null;
  createdAt: string;
}

interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  draft: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  sent: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  sending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  failed: 'Failed',
  scheduled: 'Scheduled',
  sending: 'Sending',
};

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    message: '',
    targetType: 'channel' as 'channel' | 'user',
    targetId: '',
    scheduledAt: '',
  });

  const fetchData = async () => {
    try {
      const [campaignsRes, statsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/campaigns/stats'),
      ]);
      setCampaigns(campaignsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/campaigns', {
        ...createForm,
        scheduledAt: createForm.scheduledAt || null,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', message: '', targetType: 'channel', targetId: '', scheduledAt: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  const handleAction = async (id: string, action: 'send' | 'cancel' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this campaign?')) return;
    if (action === 'cancel' && !confirm('Are you sure you want to cancel this campaign?')) return;
    setActionLoading(id);
    try {
      await api.post(`/campaigns/${id}/${action}`);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} campaign:`, err);
    } finally {
      setActionLoading(null);
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
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage Discord message campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No campaigns found</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <Badge className={statusColors[campaign.status]}>
                        {statusLabels[campaign.status]}
                      </Badge>
                      <Badge variant="outline">
                        {campaign.targetType === 'channel' ? '#' : '@'} {campaign.targetId}
                      </Badge>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 mb-3 max-w-2xl">
                      <p className="text-sm whitespace-pre-wrap">{campaign.message}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {campaign.sentCount} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        {campaign.failedCount} failed
                      </span>
                      <span className="flex items-center gap-1">
                        <SkipForward className="h-4 w-4 text-yellow-500" />
                        {campaign.skippedCount} skipped
                      </span>
                      {campaign.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewCampaign(campaign)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(campaign.id, 'send')}
                        disabled={actionLoading === campaign.id}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    )}
                    {campaign.status === 'sending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(campaign.id, 'cancel')}
                        disabled={actionLoading === campaign.id}
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(campaign.id, 'delete')}
                      disabled={actionLoading === campaign.id}
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
              <CardTitle>Create Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Summer Sale Announcement"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  placeholder="Hello @everyone! Check out our new features..."
                  className="w-full mt-1 h-32 px-3 py-2 border rounded-md bg-background text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Target Type</label>
                  <select
                    value={createForm.targetType}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, targetType: e.target.value as 'channel' | 'user' })
                    }
                    className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="channel">Channel</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {createForm.targetType === 'channel' ? 'Channel ID' : 'User ID'}
                  </label>
                  <Input
                    value={createForm.targetId}
                    onChange={(e) => setCreateForm({ ...createForm, targetId: e.target.value })}
                    placeholder="1234567890"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Schedule (optional)</label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledAt}
                  onChange={(e) => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Campaign</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Campaign Preview</CardTitle>
              <Button variant="ghost" onClick={() => setPreviewCampaign(null)}>
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-[#2f3136] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    B
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">Bot</span>
                      <Badge className="bg-blue-500/10 text-blue-500 text-[10px]">BOT</Badge>
                      <span className="text-xs text-[#72767d]">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[#dcddde] whitespace-pre-wrap text-sm">
                      {previewCampaign.message}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <div>Target: {previewCampaign.targetType} {previewCampaign.targetId}</div>
                <div>Status: {statusLabels[previewCampaign.status]}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SkipForward({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}
