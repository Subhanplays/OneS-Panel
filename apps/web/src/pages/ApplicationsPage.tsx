import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { applicationsApi, Application } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatBytes, statusColors, statusLabels } from '@/lib/utils';
import {
  Box,
  Play,
  Square,
  RefreshCw,
  Download,
  Settings,
  Trash2,
  Activity,
  HardDrive,
  Clock,
  ArrowUp,
  FileText,
} from 'lucide-react';

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const response = await applicationsApi.list();
      setApplications(response.data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'install') => {
    setActionLoading(id);
    try {
      await applicationsApi[action](id);
      await fetchApplications();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Applications</h1>
        <Button onClick={fetchApplications} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {applications.map((app) => (
          <Card 
            key={app.id} 
            className="relative overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/applications/${app.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Box className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{app.type}</p>
                  </div>
                </div>
                <Badge className={statusColors[app.status]}>
                  {statusLabels[app.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{app.description}</p>
              
              {app.status !== 'NOT_INSTALLED' && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>CPU: {app.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span>RAM: {formatBytes(app.ramUsage)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>v{app.version}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {app.status === 'NOT_INSTALLED' && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(app.id, 'install')}
                    disabled={actionLoading === app.id}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install
                  </Button>
                )}
                {app.status === 'STOPPED' && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(app.id, 'start')}
                    disabled={actionLoading === app.id}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                {app.status === 'RUNNING' && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(app.id, 'stop')}
                      disabled={actionLoading === app.id}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(app.id, 'restart')}
                      disabled={actionLoading === app.id}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart
                    </Button>
                  </>
                )}
                {(app.status === 'RUNNING' || app.status === 'STOPPED' || app.status === 'INSTALLED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(app.id, 'update')}
                    disabled={actionLoading === app.id}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                )}
                {app.status !== 'NOT_INSTALLED' && (
                  <>
                    <Link to={`/applications/${app.id}`}>
                      <Button size="sm" variant="ghost">
                        <FileText className="h-4 w-4 mr-2" />
                        Logs
                      </Button>
                    </Link>
                    <Link to={`/applications/${app.id}`}>
                      <Button size="sm" variant="ghost">
                        <Activity className="h-4 w-4 mr-2" />
                        Performance
                      </Button>
                    </Link>
                  </>
                )}
                <Link to={`/applications/${app.id}`}>
                  <Button size="sm" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                {app.status !== 'NOT_INSTALLED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('Uninstall this application? This cannot be undone.')) {
                        handleAction(app.id, 'uninstall');
                      }
                    }}
                    disabled={actionLoading === app.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
