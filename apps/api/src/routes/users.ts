import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'VIEWER']),
  permissions: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'VIEWER']).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  // Get all users
  app.get('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Get single user
  app.get('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return user;
  });

  // Create user
  app.post('/', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can create users' });
    }

    const body = createUserSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: body.role,
        permissions: body.permissions || [],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email, role: user.role },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return user;
  });

  // Update user
  app.put('/:id', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);

    // Prevent non-owners from modifying owners
    if (request.user.role !== 'OWNER') {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (targetUser?.role === 'OWNER') {
        return reply.status(403).send({ error: 'Cannot modify owner account' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'user',
        resourceId: id,
        details: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return user;
  });

  // Delete user
  app.delete('/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can delete users' });
    }

    const { id } = request.params as { id: string };

    // Prevent deleting yourself
    if (id === request.user.id) {
      return reply.status(400).send({ error: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Prevent deleting other owners
    if (user.role === 'OWNER') {
      return reply.status(403).send({ error: 'Cannot delete owner account' });
    }

    await prisma.user.delete({ where: { id } });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'user',
        resourceId: id,
        details: { email: user.email },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { success: true };
  });
}
