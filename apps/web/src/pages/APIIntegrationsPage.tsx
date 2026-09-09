import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Key,
  RefreshCw,
  Copy,
  Trash2,
  Plus,
  Webhook,
  Link,
  Activity,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
} from 'lucide-react';

interface ApiKeyInfo {
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface ApiUsageStats {
  totalRequests: number;
  requestsToday: number;
  errorRate: number;
  avgResponseTime: number;
}

interface ExternalService {
  name: string;
  type: string;
  connected: boolean;
  lastSync: string | null;
}

export function APIIntegrationsPage() {
  const [apiKey, setApiKey] = useState<ApiKeyInfo | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [services, setServices] = useState<ExternalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'services' | 'usage'>('keys');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [keyRes, webhooksRes, statsRes, servicesRes] = await Promise.allSettled([
        api.get('/api-keys/current'),
        api.get('/webhooks'),
        api.get('/api/usage'),
        api.get('/integrations'),
      ]);
      if (keyRes.status === 'fulfilled') setApiKey(keyRes.value.data.data || keyRes.value.data);
      if (webhooksRes.status === 'fulfilled') setWebhooks(webhooksRes.value.data.data || []);
      if (statsRes.status === 'fulfilled') setUsageStats(statsRes.value.data.data || null);
      if (servicesRes.status === 'fulfilled') setServices(servicesRes.value.data.data || []);
    } catch (err) {
      console.error('Failed to fetch API data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerate your API key? The old key will be invalidated immediately.')) return;
    try {
      const response = await api.post('/api-keys/regenerate');
      setApiKey(response.data.data || response.data);
      setShowKey(true);
    } catch (err) {
      console.error('Failed to regenerate key:', err);
    }
  };

  const handleCopyKey = async () => {
    if (!apiKey?.key) return;
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleCreateWebhook = async (name: string, url: string, events: string[]) => {
    try {
      const response = await api.post('/webhooks', { name, url, events, enabled: true });
      setWebhooks((prev) => [...prev, response.data.data || response.data]);
      setShowCreateWebhook(false);
    } catch (err) {
      console.error('Failed to create webhook:', err);
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
          <h1 className="text-3xl font-bold">API & Integrations</h1>
          <p className="text-muted-foreground">Manage API keys, webhooks, and external services</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {[
          { key: 'keys', label: 'API Keys', icon: Key },
          { key: 'webhooks', label: 'Webhooks', icon: Webhook },
          { key: 'services', label: 'Services', icon: Link },
          { key: 'usage', label: 'Usage', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(key as any)}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* API Keys */}
      {activeTab === 'keys' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Key
            </CardTitle>
            <CardDescription>Your API key for programmatic access to the panel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKey ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-sm bg-muted rounded-lg p-3">
                    {showKey ? apiKey.key : '•'.repeat(48)}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCopyKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {apiKey.createdAt && (
                    <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                  )}
                  {apiKey.lastUsedAt && (
                    <span>Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
                <Button variant="destructive" size="sm" onClick={handleRegenerateKey}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Key
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No API key found. Click below to generate one.
              </div>
            )}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Usage Example</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto font-mono">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  ${window.location.origin}/api/v1/status`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateWebhook(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>Configure webhooks to receive event notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No webhooks configured
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                          <Webhook className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{webhook.name}</div>
                          <div className="text-sm text-muted-foreground font-mono truncate max-w-md">
                            {webhook.url}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="secondary" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={webhook.enabled ? 'success' : 'secondary'}>
                          {webhook.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Discord Webhook</CardTitle>
              <CardDescription>Send notifications to a Discord channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  className="mt-1"
                />
              </div>
              <Button size="sm">Save Discord Webhook</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* External Services */}
      {activeTab === 'services' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              External Services
            </CardTitle>
            <CardDescription>Connect and manage external service integrations</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No external services connected
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">{service.type}</div>
                        {service.lastSync && (
                          <div className="text-xs text-muted-foreground">
                            Last sync: {new Date(service.lastSync).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={service.connected ? 'success' : 'secondary'}>
                        {service.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        {service.connected ? 'Configure' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Available Integrations</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {['Discord Bot', 'Stripe', 'PayPal', 'Pterodactyl', 'Docker Hub', 'GitHub'].map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">{name}</span>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-3xl font-bold">{usageStats?.totalRequests?.toLocaleString() || '0'}</p>
                  </div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-3xl font-bold">{usageStats?.requestsToday?.toLocaleString() || '0'}</p>
                  </div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                    <p className="text-3xl font-bold">{usageStats?.errorRate?.toFixed(1) || '0'}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-3xl font-bold">{usageStats?.avgResponseTime?.toFixed(0) || '0'}ms</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>API Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { endpoint: 'GET /api/v1/*', limit: '1000/min', used: 234 },
                  { endpoint: 'POST /api/v1/*', limit: '100/min', used: 12 },
                  { endpoint: 'DELETE /api/v1/*', limit: '50/min', used: 3 },
                ].map((item) => (
                  <div key={item.endpoint} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-mono text-sm">{item.endpoint}</div>
                      <div className="text-xs text-muted-foreground">Limit: {item.limit}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.used} used</div>
                      <div className="w-24 h-1.5 bg-muted rounded-full mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((item.used / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhook && (
        <WebhookModal
          onClose={() => setShowCreateWebhook(false)}
          onSave={handleCreateWebhook}
        />
      )}
    </div>
  );
}

function WebhookModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, url: string, events: string[]) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['alert.created', 'vps.created']);

  const availableEvents = [
    'alert.created', 'alert.acknowledged',
    'vps.created', 'vps.deleted', 'vps.started', 'vps.stopped',
    'user.created', 'user.deleted',
    'backup.created', 'backup.restored',
    'application.installed', 'application.started', 'application.stopped',
  ];

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Webhook"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Events</label>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(name, url, events)} disabled={!name || !url}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
