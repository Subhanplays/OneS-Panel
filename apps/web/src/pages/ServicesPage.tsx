import React, { useEffect, useState } from 'react';
import { applicationsApi, Application } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatBytes, statusColors, statusLabels } from '@/lib/utils';
import {
  HardDrive,
  Play,
  Square,
  RefreshCw,
  Activity,
  Clock,
  Settings,
} from 'lucide-react';

export function ServicesPage() {
  const [services, setServices] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await applicationsApi.list();
      setServices(response.data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await applicationsApi[action](id);
      await fetchServices();
    } catch (err) {
      console.error(`Failed to ${action} service:`, err);
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
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage your infrastructure services</p>
        </div>
        <Button onClick={fetchServices} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HardDrive className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{service.type}</p>
                  </div>
                </div>
                <Badge className={statusColors[service.status]}>
                  {statusLabels[service.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>CPU: {service.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>RAM: {formatBytes(service.ramUsage)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>v{service.version}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {service.status === 'STOPPED' && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(service.id, 'start')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                {service.status === 'RUNNING' && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(service.id, 'stop')}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(service.id, 'restart')}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
