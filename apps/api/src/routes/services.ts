import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { getAvailableAdapters } from '@ones-panel/service-manager';

export async function servicesRoutes(app: FastifyInstance) {
  // List available services/adapters
  app.get('/available', async () => {
    const adapters = getAvailableAdapters();
    return { data: adapters };
  });

  // List all services (applications with their current status)
  app.get('/', async () => {
    const applications = await prisma.application.findMany({
      include: {
        healthChecks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: applications };
  });

  // Get service by ID
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        healthChecks: {
          take: 10,
          orderBy: { checkedAt: 'desc' },
        },
        logs: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    return { data: application };
  });
}
