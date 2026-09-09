import React, { useEffect, useState } from 'react';
import { healthChecksApi, HealthCheck, HealthCheckResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Play, Trash2, Check, X, Clock } from 'lucide-react';

export function HealthChecksPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, HealthCheckResult>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingCheck, setEditingCheck] = useState<HealthCheck | null>(null);

  useEffect(() => {
    fetchChecks();
  }, []);

  const fetchChecks = async () => {
    try {
      const response = await healthChecksApi.list();
      setChecks(response.data);
    } catch (err) {
      console.error('Failed to fetch health checks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    try {
      const response = await healthChecksApi.run(id);
      setResults((prev) => ({ ...prev, [id]: response.data }));
    } catch (err) {
      console.error('Failed to run health check:', err);
    } finally {
      setRunning(null);
    }
  };

  const handleRunAll = async () => {
    try {
      const response = await healthChecksApi.runAll();
      const newResults: Record<string, HealthCheckResult> = {};
      response.data.forEach((result, index) => {
        newResults[checks[index]?.id] = result;
      });
      setResults(newResults);
    } catch (err) {
      console.error('Failed to run all health checks:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await healthChecksApi.delete(id);
      await fetchChecks();
    } catch (err) {
      console.error('Failed to delete health check:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-500 bg-green-500/10';
      case 'WARNING':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'http':
        return '🌐';
      case 'tcp':
        return '🔌';
      case 'process':
        return '⚙️';
      case 'docker':
        return '🐳';
      default:
        return '❓';
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
          <h1 className="text-3xl font-bold">Health Checks</h1>
          <p className="text-muted-foreground">Monitor service health and availability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunAll}>
            <Play className="h-4 w-4 mr-2" />
            Run All
          </Button>
          <Button onClick={() => { setEditingCheck(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Check
          </Button>
        </div>
      </div>

      {/* Health Checks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => {
          const result = results[check.id];
          return (
            <Card key={check.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(check.type)}</span>
                  <CardTitle className="text-lg">{check.name}</CardTitle>
                </div>
                {result && (
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="uppercase">{check.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-mono text-xs">{check.target}</span>
                  </div>
                  {check.port && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Port</span>
                      <span>{check.port}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span>{check.interval}s</span>
                  </div>
                  {result && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response</span>
                        <span>{result.message}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span>{result.responseTime}ms</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRun(check.id)}
                    disabled={running === check.id}
                  >
                    {running === check.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingCheck(check); setShowModal(true); }}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(check.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {checks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No health checks configured</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Check
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <HealthCheckModal
          check={editingCheck}
          onClose={() => { setShowModal(false); setEditingCheck(null); }}
          onSave={async () => { setShowModal(false); await fetchChecks(); }}
        />
      )}
    </div>
  );
}

function HealthCheckModal({ check, onClose, onSave }: { check: HealthCheck | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(check?.name || '');
  const [type, setType] = useState(check?.type || 'http');
  const [target, setTarget] = useState(check?.target || '');
  const [port, setPort] = useState(check?.port || 80);
  const [interval, setInterval] = useState(check?.interval || 60);
  const [timeout, setTimeout] = useState(check?.timeout || 5);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (check) {
        await healthChecksApi.update(check.id, { name, type, target, port, interval, timeout, enabled: true });
      } else {
        await healthChecksApi.create({ name, type, target, port, interval, timeout, enabled: true });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save health check:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{check ? 'Edit Health Check' : 'Create Health Check'}</CardTitle>
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
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            >
              <option value="http">HTTP</option>
              <option value="tcp">TCP</option>
              <option value="process">Process</option>
              <option value="docker">Docker</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">
              {type === 'process' ? 'Process Name' : type === 'docker' ? 'Container Name' : 'Target URL/Host'}
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === 'http' ? 'https://example.com' : type === 'docker' ? 'container-name' : 'localhost'}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
          </div>
          {(type === 'tcp' || type === 'http') && (
            <div>
              <label className="text-sm font-medium">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Interval (s)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timeout (s)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
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
