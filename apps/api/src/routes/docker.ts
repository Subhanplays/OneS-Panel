import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function dockerRoutes(app: FastifyInstance) {
  // Check if Docker is available
  app.get('/check', async () => {
    try {
      await execAsync('docker --version');
      return { available: true };
    } catch {
      return { available: false };
    }
  });

  // List containers
  app.get('/containers', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const { stdout } = await execAsync(
        'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.State}}"'
      );

      const containers = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, image, status, ports, state] = line.split('|');
          return { id, name, image, status, ports, state };
        });

      return containers;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to list containers', details: err.message });
    }
  });

  // List images
  app.get('/images', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const { stdout } = await execAsync(
        'docker images --format "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedAt}}"'
      );

      const images = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, repository, tag, size, createdAt] = line.split('|');
          return { id, repository, tag, size, createdAt };
        });

      return images;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to list images', details: err.message });
    }
  });

  // List volumes
  app.get('/volumes', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const { stdout } = await execAsync(
        'docker volume ls --format "{{.Name}}|{{.Driver}}"'
      );

      const volumes = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [name, driver] = line.split('|');
          return { name, driver };
        });

      return volumes;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to list volumes', details: err.message });
    }
  });

  // List networks
  app.get('/networks', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const { stdout } = await execAsync(
        'docker network ls --format "{{.ID}}|{{.Name}}|{{.Driver}}|{{.Scope}}"'
      );

      const networks = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, driver, scope] = line.split('|');
          return { id, name, driver, scope };
        });

      return networks;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to list networks', details: err.message });
    }
  });

  // Container actions
  app.post('/containers/:id/start', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    try {
      await execAsync(`docker start ${id}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to start container', details: err.message });
    }
  });

  app.post('/containers/:id/stop', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    try {
      await execAsync(`docker stop ${id}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to stop container', details: err.message });
    }
  });

  app.post('/containers/:id/restart', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    try {
      await execAsync(`docker restart ${id}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to restart container', details: err.message });
    }
  });

  app.post('/containers/:id/remove', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can remove containers' });
    }

    const { id } = request.params as { id: string };

    try {
      await execAsync(`docker rm -f ${id}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to remove container', details: err.message });
    }
  });

  // Get container logs
  app.get('/containers/:id/logs', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const { lines = 100 } = request.query as { lines?: number };

    try {
      const { stdout } = await execAsync(`docker logs --tail ${lines} ${id}`);
      return stdout.split('\n');
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to get logs', details: err.message });
    }
  });

  // Get container stats
  app.get('/containers/:id/stats', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    try {
      const { stdout } = await execAsync(
        `docker stats ${id} --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"`
      );

      const [cpu, memUsage, memPerc, netIO, blockIO] = stdout.trim().split('|');

      return { cpu, memUsage, memPerc, netIO, blockIO };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to get stats', details: err.message });
    }
  });

  // Image actions
  app.post('/images/:id/remove', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can remove images' });
    }

    const { id } = request.params as { id: string };

    try {
      await execAsync(`docker rmi -f ${id}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to remove image', details: err.message });
    }
  });

  // Volume actions
  app.post('/volumes/:name/remove', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can remove volumes' });
    }

    const { name } = request.params as { name: string };

    try {
      await execAsync(`docker volume rm ${name}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to remove volume', details: err.message });
    }
  });

  // System prune
  app.post('/prune', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can prune Docker' });
    }

    try {
      const { stdout } = await execAsync('docker system prune -f');
      return { output: stdout };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to prune', details: err.message });
    }
  });
}
