import React, { useEffect, useState } from 'react';
import { alertsApi, Alert, AlertRule } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Settings,
  Bell,
  BellOff,
} from 'lucide-react';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, rulesRes, statsRes] = await Promise.all([
        alertsApi.list({ limit: 100 }),
        alertsApi.getRules(),
        alertsApi.stats(),
      ]);
      setAlerts(alertsRes.data.alerts);
      setRules(rulesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alertsApi.delete(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClearAcknowledged = async () => {
    try {
      await alertsApi.clearAcknowledged();
      await fetchData();
    } catch (err) {
      console.error('Failed to clear:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await alertsApi.deleteRule(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true;
    if (filter === 'unacknowledged') return !alert.acknowledged;
    return alert.severity.toLowerCase() === filter;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'error':
        return 'text-red-500 bg-red-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'info':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
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
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Monitor system alerts and notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearAcknowledged}>
            Clear Acknowledged
          </Button>
          <Button onClick={() => { setEditingRule(null); setShowRuleModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-3xl font-bold">{stats.today}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-3xl font-bold">{stats.thisWeek}</p>
                </div>
                <Bell className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unacknowledged</p>
                  <p className="text-3xl font-bold">{stats.unacknowledged}</p>
                </div>
                <BellOff className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                  <p className="text-3xl font-bold">{rules.length}</p>
                </div>
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'unacknowledged', 'critical', 'warning', 'info'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alerts found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(alert.id)}
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

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alert rules configured
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {rule.metric} {rule.condition} {rule.threshold}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
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

      {/* Rule Modal */}
      {showRuleModal && (
        <RuleModal
          rule={editingRule}
          onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
          onSave={async () => { setShowRuleModal(false); await fetchData(); }}
        />
      )}
    </div>
  );
}

function RuleModal({ rule, onClose, onSave }: { rule: AlertRule | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(rule?.name || '');
  const [metric, setMetric] = useState(rule?.metric || 'cpu');
  const [condition, setCondition] = useState(rule?.condition || 'gt');
  const [threshold, setThreshold] = useState(rule?.threshold || 80);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (rule) {
        await alertsApi.updateRule(rule.id, { name, metric, condition, threshold, duration: 60, enabled, notify: ['panel'] });
      } else {
        await alertsApi.createRule({ name, metric, condition, threshold, duration: 60, enabled, notify: ['panel'] });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save rule:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{rule ? 'Edit Rule' : 'Create Rule'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">Metric</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              >
                <option value="cpu">CPU</option>
                <option value="ram">Memory</option>
                <option value="disk">Disk</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              >
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
                <option value="eq">Equals</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Threshold %</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              id="enabled"
            />
            <label htmlFor="enabled" className="text-sm">Enabled</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
