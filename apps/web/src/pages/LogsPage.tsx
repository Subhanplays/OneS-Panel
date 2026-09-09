import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  FileText,
  RefreshCw,
  Search,
  AlertTriangle,
  Info,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface LogEntry {
  id: string;
  serviceId: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  application?: {
    id: string;
    name: string;
    type: string;
  };
}

interface LogStats {
  total: number;
  last24h: {
    errors: number;
    warnings: number;
    info: number;
  };
}

const levelColors: Record<string, string> = {
  INFO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  WARNING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  ERROR: 'bg-red-500/10 text-red-500 border-red-500/20',
  DEBUG: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const levelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  DEBUG: FileText,
};

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchData();
  }, [level, page]);

  const fetchData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get('/logs', {
          params: { limit: 50, offset: page * 50, level: level || undefined, search: search || undefined },
        }),
        api.get('/logs/stats'),
      ]);
      setLogs(logsRes.data.data);
      setHasMore(logsRes.data.hasMore);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const handleClearOld = async () => {
    if (!confirm('Clear logs older than 30 days?')) return;
    try {
      await api.delete('/logs/clear', { params: { days: 30 } });
      await fetchData();
    } catch (err) {
      console.error('Failed to clear logs:', err);
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
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground">View system and application logs</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClearOld} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Old
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors (24h)</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.last24h.errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings (24h)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.last24h.warnings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Info (24h)</CardTitle>
              <Info className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.last24h.info}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex gap-2">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={level === '' ? 'default' : 'outline'}
            onClick={() => { setLevel(''); setPage(0); }}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={level === 'ERROR' ? 'default' : 'outline'}
            onClick={() => { setLevel('ERROR'); setPage(0); }}
          >
            Errors
          </Button>
          <Button
            size="sm"
            variant={level === 'WARNING' ? 'default' : 'outline'}
            onClick={() => { setLevel('WARNING'); setPage(0); }}
          >
            Warnings
          </Button>
          <Button
            size="sm"
            variant={level === 'INFO' ? 'default' : 'outline'}
            onClick={() => { setLevel('INFO'); setPage(0); }}
          >
            Info
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No logs found</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const Icon = levelIcons[log.level] || FileText;
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={levelColors[log.level]}>
                            {log.level}
                          </Badge>
                          {log.application && (
                            <span className="text-sm text-muted-foreground">
                              {log.application.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
