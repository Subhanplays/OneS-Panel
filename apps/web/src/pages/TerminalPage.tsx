import React, { useState, useRef, useEffect } from 'react';
import { terminalApi, TerminalSession } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Terminal as TerminalIcon, Send, Trash2, Copy, Loader2 } from 'lucide-react';

interface TerminalLine {
  id: number;
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

export function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'system', content: 'Ones Panel Terminal', timestamp: new Date() },
    { id: 1, type: 'system', content: 'Commands are executed on the server. Type "help" for available commands.', timestamp: new Date() },
  ]);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [sessionError, setSessionError] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initSession();
    return () => {
      if (session) terminalApi.closeSession(session.id).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const initSession = async () => {
    try {
      const res = await terminalApi.createSession();
      setSession(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSessionError(error.response?.data?.error || 'Failed to create terminal session');
    }
  };

  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { id: Date.now() + Math.random(), type, content, timestamp: new Date() }]);
  };

  const executeCommand = async () => {
    if (!command.trim() || isExecuting || !session) return;

    const cmd = command.trim();
    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    addLine('command', `$ ${cmd}`);
    setCommand('');
    setIsExecuting(true);

    if (cmd === 'clear') {
      setLines([]);
      setIsExecuting(false);
      return;
    }

    if (cmd === 'help') {
      addLine('output', [
        'Available commands:',
        '  help       Show this help message',
        '  clear      Clear terminal',
        '  date       Show current date and time',
        '  uptime     Show system uptime',
        '  whoami     Show current user',
        '  hostname   Show hostname',
        '  ls         List files',
        '  pwd        Print working directory',
        '  cat        Display file contents',
        '  df         Show disk usage',
        '  free       Show memory usage',
        '  ps         Show processes',
        '  top        Show top processes',
        '  ping       Ping a host',
        '  curl       Make HTTP request',
        '  docker     Docker commands',
        '  systemctl  Service management',
        '',
        'All other commands are executed directly on the server.',
      ].join('\n'));
      setIsExecuting(false);
      return;
    }

    try {
      const res = await terminalApi.executeCommand(session.id, cmd);
      const { output, exitCode } = res.data;
      if (output) {
        addLine(exitCode === 0 ? 'output' : 'error', output);
      }
      if (exitCode !== 0 && !output) {
        addLine('error', `Command exited with code ${exitCode}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      addLine('error', error.response?.data?.error || 'Failed to execute command');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const clearTerminal = () => setLines([]);

  const copyToClipboard = () => {
    const text = lines.map(l => l.content).join('\n');
    navigator.clipboard.writeText(text);
  };

  if (sessionError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Terminal</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TerminalIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-destructive mb-4">{sessionError}</p>
            <Button onClick={initSession}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terminal</h1>
          <p className="text-muted-foreground">Execute commands on the server</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
          <Button onClick={clearTerminal} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      <Card className="bg-black text-green-400 font-mono">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-5 w-5" />
            <CardTitle className="text-sm">Terminal</CardTitle>
            {session && <Badge variant="outline" className="ml-auto text-xs">Session: {session.id.slice(0, 8)}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={terminalRef}
            className="h-[500px] overflow-y-auto p-4"
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map(line => (
              <div key={line.id} className="mb-1 whitespace-pre-wrap break-all">
                {line.type === 'command' && <span className="text-white">{line.content}</span>}
                {line.type === 'output' && <span className="text-green-400">{line.content}</span>}
                {line.type === 'error' && <span className="text-red-400">{line.content}</span>}
                {line.type === 'system' && <span className="text-blue-400">{line.content}</span>}
              </div>
            ))}
            {isExecuting && (
              <div className="text-yellow-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Executing...
              </div>
            )}
          </div>
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-400">$</span>
              <input
                ref={inputRef}
                value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-green-400 placeholder-gray-600 focus:outline-none focus:ring-0 font-mono"
                placeholder={session ? 'Enter command...' : 'Connecting...'}
                disabled={isExecuting || !session}
                autoFocus
              />
              <Button
                onClick={executeCommand}
                size="sm"
                variant="ghost"
                disabled={isExecuting || !command.trim() || !session}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
