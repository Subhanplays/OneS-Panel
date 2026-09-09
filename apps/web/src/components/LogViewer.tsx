import React, { useEffect, useState, useRef } from 'react';
import { applicationsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RefreshCw, Download, Trash2, Filter } from 'lucide-react';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface LogViewerProps {
  applicationId: string;
}

export function LogViewer({ applicationId }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [adapterLogs, setAdapterLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const response = await applicationsApi.logs(applicationId, 200);
      setLogs(response.data.dbLogs || []);
      setAdapterLogs(response.data.adapterLogs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [applicationId]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, applicationId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level.toLowerCase() === filter.toLowerCase();
  });

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500 bg-red-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'info':
        return 'text-blue-500 bg-blue-500/10';
      case 'debug':
        return 'text-gray-500 bg-gray-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Logs</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 overflow-y-auto font-mono text-sm space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 && adapterLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No logs available
            </div>
          ) : (
            <>
              {/* Database logs */}
              {filteredLogs.map((log, index) => (
                <div key={`db-${index}`} className="flex items-start gap-2 py-1 hover:bg-accent/50 px-2 rounded">
                  <Badge className={`${getLevelColor(log.level)} text-xs min-w-[60px] justify-center`}>
                    {log.level}
                  </Badge>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="flex-1 break-words">{log.message}</span>
                </div>
              ))}
              
              {/* Adapter logs */}
              {adapterLogs.map((log, index) => (
                <div key={`adapter-${index}`} className="flex items-start gap-2 py-1 hover:bg-accent/50 px-2 rounded">
                  <Badge className="text-gray-500 bg-gray-500/10 text-xs min-w-[60px] justify-center">
                    LOG
                  </Badge>
                  <span className="flex-1 break-words">{log}</span>
                </div>
              ))}
            </>
          )}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
