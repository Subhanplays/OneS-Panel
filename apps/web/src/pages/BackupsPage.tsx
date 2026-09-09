import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/lib/utils';
import { Database, FileJson, Download, Trash2, RefreshCw, Upload, Plus } from 'lucide-react';
import api from '@/lib/api';

interface Backup {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  type: 'database' | 'config';
}

export function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await api.get('/backups');
      setBackups(response.data);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (type: 'database' | 'config') => {
    setCreating(type);
    try {
      await api.post(`/backups/${type}`);
      await fetchBackups();
    } catch (err) {
      console.error('Failed to create backup:', err);
    } finally {
      setCreating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      try {
        await api.delete(`/backups/${id}`);
        await fetchBackups();
      } catch (err) {
        console.error('Failed to delete backup:', err);
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      try {
        await api.post(`/backups/${id}/restore`);
        alert('Backup restored successfully');
      } catch (err) {
        console.error('Failed to restore backup:', err);
        alert('Failed to restore backup');
      }
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/backups/${id}/download`, '_blank');
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
          <h1 className="text-3xl font-bold">Backups</h1>
          <p className="text-muted-foreground">Manage system backups and restores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBackups}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Create Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-8 w-8 text-primary" />
                <div>
                  <div className="font-medium">Database Backup</div>
                  <div className="text-sm text-muted-foreground">Backup all database tables</div>
                </div>
              </div>
              <Button
                onClick={() => handleCreateBackup('database')}
                disabled={creating === 'database'}
                className="w-full"
              >
                {creating === 'database' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Database Backup
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <FileJson className="h-8 w-8 text-primary" />
                <div>
                  <div className="font-medium">Config Backup</div>
                  <div className="text-sm text-muted-foreground">Backup settings and branding</div>
                </div>
              </div>
              <Button
                onClick={() => handleCreateBackup('config')}
                disabled={creating === 'config'}
                className="w-full"
              >
                {creating === 'config' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Config Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No backups yet. Create your first backup above.
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    {backup.type === 'database' ? (
                      <Database className="h-8 w-8 text-primary" />
                    ) : (
                      <FileJson className="h-8 w-8 text-primary" />
                    )}
                    <div>
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(backup.size)} • {new Date(backup.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={backup.type === 'database' ? 'default' : 'secondary'}>
                      {backup.type}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(backup.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRestore(backup.id)}>
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(backup.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
