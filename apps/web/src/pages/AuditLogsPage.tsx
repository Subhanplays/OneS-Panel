import React, { useEffect, useState } from 'react';
import { auditApi, AuditLog } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Shield, Filter, Download, RefreshCw, Search } from 'lucide-react';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    search: '',
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditApi.list({
        limit: 50,
        offset: page * 50,
        resource: filters.resource || undefined,
        action: filters.action || undefined,
      });
      setLogs(response.data.data || []);
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await auditApi.stats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'text-green-500 bg-green-500/10';
      case 'update':
        return 'text-blue-500 bg-blue-500/10';
      case 'delete':
        return 'text-red-500 bg-red-500/10';
      case 'start':
      case 'stop':
      case 'restart':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        log.user?.name?.toLowerCase().includes(searchLower) ||
        log.user?.email?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading && logs.length === 0) {
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
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all actions and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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
                <Shield className="h-8 w-8 text-primary" />
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
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold">{stats.thisMonth}</p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
                />
              </div>
            </div>
            <select
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All Resources</option>
              <option value="application">Applications</option>
              <option value="user">Users</option>
              <option value="setting">Settings</option>
              <option value="branding">Branding</option>
              <option value="alert_rule">Alert Rules</option>
              <option value="status_service">Status Services</option>
              <option value="incident">Incidents</option>
            </select>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="START">Start</option>
              <option value="STOP">Stop</option>
              <option value="RESTART">Restart</option>
              <option value="INSTALL">Install</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            <span className="text-sm text-muted-foreground">
              {total} total entries
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50">
                  <Badge className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.resource}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{log.resourceId}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      by {log.user?.name || 'Unknown'} ({log.user?.email || 'N/A'})
                    </div>
                    {Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2 font-mono bg-secondary p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.ipAddress}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / 50)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Actions */}
      {stats?.topActions && stats.topActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topActions.map((item: { action: string; count: number }) => (
                <div key={item.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getActionColor(item.action)}>
                      {item.action}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">{item.count} times</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
