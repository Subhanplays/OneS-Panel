import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  panelName: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // Check if initial setup is needed
  app.get('/setup', async () => {
    const userCount = await prisma.user.count();
    return { needsSetup: userCount === 0 };
  });

  // Login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // Register (first user becomes owner)
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return reply.status(403).send({ error: 'Registration is disabled' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: 'OWNER',
        permissions: ['*'],
      },
    });

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    // Update branding if panelName provided
    if (body.panelName) {
      await prisma.branding.updateMany({
        data: {
          panelName: body.panelName,
          browserTitle: body.panelName,
        },
      });
    }

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(200).send({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
    });

    return user;
  });

  // Logout
  app.post('/logout', async () => {
    return { success: true };
  });
}
