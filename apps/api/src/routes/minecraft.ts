import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const createServerSchema = z.object({
  name: z.string().min(1),
  software: z.string().default('paper'),
  version: z.string().default('1.20.4'),
  port: z.number().int().min(1).max(65535).default(25565),
  maxPlayers: z.number().int().min(1).max(1000).default(20),
  nodeId: z.string().optional(),
});

const updateServerSchema = createServerSchema.partial();

const createNodeSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(25575),
  token: z.string().min(1),
});

const updateNodeSchema = createNodeSchema.partial();

export async function minecraftRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const servers = await prisma.minecraftServer.findMany({
      include: { node: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: servers };
  });

  app.get('/stats', async () => {
    const [total, running, offline, aggregate] = await Promise.all([
      prisma.minecraftServer.count(),
      prisma.minecraftServer.count({ where: { status: 'running' } }),
      prisma.minecraftServer.count({ where: { status: 'stopped' } }),
      prisma.minecraftServer.aggregate({
        _sum: { cpuUsage: true, ramUsage: true, diskUsage: true, onlinePlayers: true },
      }),
    ]);

    return {
      data: {
        total,
        running,
        offline,
        totalPlayers: aggregate._sum.onlinePlayers ?? 0,
        totalCpu: aggregate._sum.cpuUsage ?? 0,
        totalRam: Number(aggregate._sum.ramUsage ?? 0),
        totalDisk: Number(aggregate._sum.diskUsage ?? 0),
      },
    };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.minecraftServer.findUnique({
      where: { id },
      include: { node: true },
    });
    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    return { data: server };
  });

  app.post('/', async (request, reply) => {
    const parsed = createServerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    if (parsed.data.nodeId) {
      const node = await prisma.minecraftNode.findUnique({ where: { id: parsed.data.nodeId } });
      if (!node) {
        return reply.status(404).send({ error: 'Node not found' });
      }
    }

    const server = await prisma.minecraftServer.create({
      data: {
        name: parsed.data.name,
        software: parsed.data.software,
        version: parsed.data.version,
        port: parsed.data.port,
        maxPlayers: parsed.data.maxPlayers,
        nodeId: parsed.data.nodeId ?? null,
      },
      include: { node: true },
    });

    if (parsed.data.nodeId) {
      await prisma.minecraftNode.update({
        where: { id: parsed.data.nodeId },
        data: { serverCount: { increment: 1 } },
      });
    }

    return reply.status(201).send({ data: server });
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateServerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const existing = await prisma.minecraftServer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    if (parsed.data.nodeId) {
      const node = await prisma.minecraftNode.findUnique({ where: { id: parsed.data.nodeId } });
      if (!node) {
        return reply.status(404).send({ error: 'Node not found' });
      }
    }

    const server = await prisma.minecraftServer.update({
      where: { id },
      data: parsed.data,
      include: { node: true },
    });

    return { data: server };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.minecraftServer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    await prisma.minecraftServer.delete({ where: { id } });

    if (existing.nodeId) {
      await prisma.minecraftNode.update({
        where: { id: existing.nodeId },
        data: { serverCount: { decrement: 1 } },
      });
    }

    return { success: true };
  });

  app.post('/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };

    const server = await prisma.minecraftServer.findUnique({ where: { id } });
    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    if (server.status === 'running') {
      return reply.status(400).send({ error: 'Server is already running' });
    }

    const updated = await prisma.minecraftServer.update({
      where: { id },
      data: { status: 'running' },
      include: { node: true },
    });

    return { data: updated };
  });

  app.post('/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };

    const server = await prisma.minecraftServer.findUnique({ where: { id } });
    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    if (server.status === 'stopped') {
      return reply.status(400).send({ error: 'Server is already stopped' });
    }

    const updated = await prisma.minecraftServer.update({
      where: { id },
      data: { status: 'stopped', onlinePlayers: 0 },
      include: { node: true },
    });

    return { data: updated };
  });

  app.post('/:id/restart', async (request, reply) => {
    const { id } = request.params as { id: string };

    const server = await prisma.minecraftServer.findUnique({ where: { id } });
    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const updated = await prisma.minecraftServer.update({
      where: { id },
      data: { status: 'restarting' },
      include: { node: true },
    });

    await prisma.minecraftServer.update({
      where: { id },
      data: { status: 'running' },
    });

    return { data: updated };
  });

  // --- Node routes ---

  app.get('/nodes', async () => {
    const nodes = await prisma.minecraftNode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: nodes };
  });

  app.post('/nodes', async (request, reply) => {
    const parsed = createNodeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const node = await prisma.minecraftNode.create({
      data: {
        name: parsed.data.name,
        host: parsed.data.host,
        port: parsed.data.port,
        token: parsed.data.token,
      },
    });

    return reply.status(201).send({ data: node });
  });

  app.put('/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateNodeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const existing = await prisma.minecraftNode.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Node not found' });
    }

    const node = await prisma.minecraftNode.update({
      where: { id },
      data: parsed.data,
    });

    return { data: node };
  });

  app.delete('/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.minecraftNode.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Node not found' });
    }

    await prisma.minecraftNode.delete({ where: { id } });

    return { success: true };
  });

  app.get('/nodes/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };

    const node = await prisma.minecraftNode.findUnique({ where: { id } });
    if (!node) {
      return reply.status(404).send({ error: 'Node not found' });
    }

    const servers = await prisma.minecraftServer.findMany({
      where: { nodeId: id },
    });

    const totalServers = servers.length;
    const runningServers = servers.filter((s) => s.status === 'running').length;
    const totalPlayers = servers.reduce((sum, s) => sum + s.onlinePlayers, 0);

    return {
      data: {
        ...node,
        totalServers,
        runningServers,
        totalPlayers,
      },
    };
  });
}
