import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { prisma } from '@ones-panel/database';

const clients = new Set<WebSocket>();

export async function websocketRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket: WebSocket, request) => {
    clients.add(socket);
    console.log('WebSocket client connected. Total:', clients.size);

    socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'subscribe':
            // Handle subscription to specific channels
            break;
          case 'unsubscribe':
            // Handle unsubscription
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      console.log('WebSocket client disconnected. Total:', clients.size);
    });

    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    }));
  });

  // Broadcast metrics to all connected clients
  app.get('/api/ws/metrics', async () => {
    broadcastMetrics();
    return { success: true };
  });
}

export function broadcastMetrics() {
  const message = JSON.stringify({
    type: 'metrics',
    timestamp: new Date().toISOString(),
    data: getSystemMetrics(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastStatus(applicationId: string, status: string) {
  const message = JSON.stringify({
    type: 'status',
    timestamp: new Date().toISOString(),
    data: { applicationId, status },
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastLog(log: any) {
  const message = JSON.stringify({
    type: 'log',
    timestamp: new Date().toISOString(),
    data: log,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastAlert(alert: any) {
  const message = JSON.stringify({
    type: 'alert',
    timestamp: new Date().toISOString(),
    data: alert,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getSystemMetrics() {
  const os = require('os');
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const loadAvg = os.loadavg();

  return {
    cpu: Math.round((loadAvg[0] / cpus.length) * 100),
    ram: Math.round(((totalMem - freeMem) / totalMem) * 100),
    ramUsed: totalMem - freeMem,
    ramTotal: totalMem,
    loadAverage: loadAvg,
    uptime: os.uptime(),
  };
}

// Start periodic metrics broadcast
let metricsInterval: NodeJS.Timeout | null = null;

export function startMetricsBroadcast(intervalMs: number = 30000) {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  
  metricsInterval = setInterval(() => {
    broadcastMetrics();
  }, intervalMs);
}

export function stopMetricsBroadcast() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}
