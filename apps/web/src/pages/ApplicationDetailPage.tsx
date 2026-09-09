import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsApi, Application } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LogViewer } from '@/components/LogViewer';
import { MetricsChart } from '@/components/MetricsChart';
import { formatBytes, statusColors, statusLabels } from '@/lib/utils';
import {
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Settings,
  Trash2,
  Activity,
  Clock,
  Server,
} from 'lucide-react';

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  const fetchApplication = async () => {
    if (!id) return;
    try {
      const [appRes, metricsRes] = await Promise.all([
        applicationsApi.get(id),
        applicationsApi.metrics(id).catch(() => ({ data: null })),
      ]);
      setApplication(appRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Failed to fetch application:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'install') => {
    if (!id) return;
    setActionLoading(action);
    try {
      await applicationsApi[action](id);
      await fetchApplication();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
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

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="outline" onClick={() => navigate('/applications')} className="mt-4">
          Back to Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/applications')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{application.name}</h1>
            <p className="text-muted-foreground">{application.description}</p>
          </div>
        </div>
        <Badge className={statusColors[application.status]}>
          {statusLabels[application.status]}
        </Badge>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {application.status === 'NOT_INSTALLED' && (
              <Button
                onClick={() => handleAction('install')}
                disabled={actionLoading === 'install'}
              >
                {actionLoading === 'install' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Install
              </Button>
            )}
            {application.status === 'STOPPED' && (
              <Button
                onClick={() => handleAction('start')}
                disabled={actionLoading === 'start'}
              >
                {actionLoading === 'start' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start
              </Button>
            )}
            {application.status === 'RUNNING' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading === 'stop'}
                >
                  {actionLoading === 'stop' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading === 'restart'}
                >
                  {actionLoading === 'restart' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Restart
                </Button>
              </>
            )}
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={fetchApplication}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{application.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">{application.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Installed</p>
                <p className="font-medium">
                  {application.installedAt
                    ? new Date(application.installedAt).toLocaleDateString()
                    : 'Not installed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance</h2>
        <MetricsChart metrics={metrics} />
      </div>

      {/* Logs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Logs</h2>
        <LogViewer applicationId={application.id} />
      </div>
    </div>
  );
}
