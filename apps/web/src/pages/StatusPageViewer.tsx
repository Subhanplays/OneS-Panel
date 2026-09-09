import React, { useEffect, useState } from 'react';
import { statusPageApi, StatusService, Incident, Maintenance, api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Check, AlertTriangle, Wrench, Plus, Settings, Play, Square, RefreshCw, Download, Activity, Trash2, ExternalLink } from 'lucide-react';

export function StatusPage() {
  const [services, setServices] = useState<StatusService[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [editingService, setEditingService] = useState<StatusService | null>(null);
  const [statusApp, setStatusApp] = useState<{ status: string; cpuUsage: number; ramUsage: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, incidentsRes, maintenanceRes, appsRes] = await Promise.all([
        statusPageApi.getServices(),
        statusPageApi.getIncidents(),
        statusPageApi.getMaintenance(),
        api.get('/applications').catch(() => ({ data: [] })),
      ]);
      setServices(servicesRes.data);
      setIncidents(incidentsRes.data);
      setMaintenance(maintenanceRes.data);
      
      // Find status page application
      const statusPageApp = appsRes.data?.find?.((a: { slug: string }) => a.slug === 'status-page');
      if (statusPageApp) {
        setStatusApp({
          status: statusPageApp.status,
          cpuUsage: statusPageApp.cpuUsage || 0,
          ramUsage: statusPageApp.ramUsage || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (id: string, status: string) => {
    try {
      await statusPageApi.updateService(id, { status: status as any });
      await fetchData();
    } catch (err) {
      console.error('Failed to update service:', err);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await statusPageApi.deleteService(id);
        await fetchData();
      } catch (err) {
        console.error('Failed to delete service:', err);
      }
    }
  };

  const handleStatusAppAction = async (action: string) => {
    setActionLoading(true);
    try {
      // Find the status page app ID
      const appsRes = await api.get('/applications');
      const statusApp = appsRes.data?.find?.((a: { slug: string }) => a.slug === 'status-page');
      if (statusApp) {
        await api.post(`/applications/${statusApp.id}/${action}`);
        await fetchData();
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const getOverallStatus = () => {
    const statuses = services.map(s => s.status);
    if (statuses.includes('major_outage')) return { label: 'Major Outage', color: 'bg-red-500' };
    if (statuses.includes('partial_outage')) return { label: 'Partial Outage', color: 'bg-orange-500' };
    if (statuses.includes('degraded')) return { label: 'Degraded Performance', color: 'bg-yellow-500' };
    if (statuses.includes('maintenance')) return { label: 'Under Maintenance', color: 'bg-blue-500' };
    return { label: 'All Systems Operational', color: 'bg-green-500' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'partial_outage':
      case 'major_outage':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-blue-500" />;
      default:
        return <Check className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-500 bg-green-500/10';
      case 'degraded':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'partial_outage':
        return 'text-orange-500 bg-orange-500/10';
      case 'major_outage':
        return 'text-red-500 bg-red-500/10';
      case 'maintenance':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'identified':
        return 'text-orange-500 bg-orange-500/10';
      case 'monitoring':
        return 'text-blue-500 bg-blue-500/10';
      case 'resolved':
        return 'text-green-500 bg-green-500/10';
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

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Status Page</h1>
          <p className="text-muted-foreground">Manage service status and incidents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowIncidentModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
          <Button onClick={() => { setEditingService(null); setShowServiceModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Status Page Management */}
      {statusApp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Page Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={statusApp.status === 'RUNNING' ? 'success' : statusApp.status === 'ERROR' ? 'error' : 'secondary'}>
                  {statusApp.status}
                </Badge>
                <span className="text-sm text-muted-foreground">CPU: {statusApp.cpuUsage.toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground">RAM: {(statusApp.ramUsage / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex gap-2">
                {statusApp.status === 'STOPPED' && (
                  <Button size="sm" onClick={() => handleStatusAppAction('start')} disabled={actionLoading}>
                    <Play className="h-4 w-4 mr-2" /> Start
                  </Button>
                )}
                {statusApp.status === 'RUNNING' && (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusAppAction('stop')} disabled={actionLoading}>
                      <Square className="h-4 w-4 mr-2" /> Stop
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusAppAction('restart')} disabled={actionLoading}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Restart
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => handleStatusAppAction('update')} disabled={actionLoading}>
                  <Download className="h-4 w-4 mr-2" /> Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Status Banner */}
      <Card className={`border-0 ${overallStatus.color}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-white">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span className="text-xl font-semibold">{overallStatus.label}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenance.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardContent className="p-6">
              {services.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No services configured
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(service.status)}
                        <div>
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-muted-foreground">{service.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(service.status)}>
                          {service.status.replace('_', ' ')}
                        </Badge>
                        <select
                          value={service.status}
                          onChange={(e) => handleServiceAction(service.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1 bg-background"
                        >
                          <option value="operational">Operational</option>
                          <option value="degraded">Degraded</option>
                          <option value="partial_outage">Partial Outage</option>
                          <option value="major_outage">Major Outage</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteService(service.id)}>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardContent className="p-6">
              {incidents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No incidents reported
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{incident.title}</div>
                        <Badge className={getIncidentStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{incident.message}</p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleString()}
                        {incident.resolvedAt && ` • Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-6">
              {maintenance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled maintenance
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenance.map((m) => (
                    <div key={m.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{m.title}</div>
                        <Badge variant={m.status === 'completed' ? 'success' : 'outline'}>
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{m.message}</p>
                      <div className="text-xs text-muted-foreground">
                        Scheduled: {new Date(m.scheduledAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          onClose={() => { setShowServiceModal(false); setEditingService(null); }}
          onSave={async () => { setShowServiceModal(false); await fetchData(); }}
        />
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <IncidentModal
          onClose={() => setShowIncidentModal(false)}
          onSave={async () => { setShowIncidentModal(false); await fetchData(); }}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, onClose, onSave }: { service: StatusService | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [url, setUrl] = useState(service?.url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (service) {
        await statusPageApi.updateService(service.id, { name, description, url });
      } else {
        await statusPageApi.createService({ name, description, url, status: 'operational' });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{service ? 'Edit Service' : 'Add Service'}</CardTitle>
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
            <label className="text-sm font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL (optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
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

function IncidentModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('investigating');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await statusPageApi.createIncident({ title, message, status: status as any });
      onSave();
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Report Incident</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            >
              <option value="investigating">Investigating</option>
              <option value="identified">Identified</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create Incident'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
