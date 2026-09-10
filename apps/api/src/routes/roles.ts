import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';

const PERMISSION_CATEGORIES: Record<string, string[]> = {
  vps: ['vps.view', 'vps.manage', 'vps.create', 'vps.delete'],
  applications: ['applications.view', 'applications.manage', 'applications.install'],
  minecraft: ['minecraft.view', 'minecraft.manage'],
  bots: ['bots.view', 'bots.manage'],
  logs: ['logs.view', 'logs.clear'],
  terminal: ['terminal.use'],
  settings: ['settings.view', 'settings.manage'],
  users: ['users.view', 'users.manage'],
  backups: ['backups.view', 'backups.manage', 'backups.create'],
  alerts: ['alerts.view', 'alerts.manage'],
  branding: ['branding.view', 'branding.manage'],
  dashboard: ['dashboard.view'],
};

const prismaAny = prisma as any;

export async function rolesRoutes(app: FastifyInstance) {
  // List all roles with permission counts
  app.get('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const roles = await prismaAny.role.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const rolesWithCounts = roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      permissionCount: role.permissions.length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return { data: rolesWithCounts };
  });

  // List all available permissions organized by category
  app.get('/permissions', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    return { data: PERMISSION_CATEGORIES };
  });

  // Create role
  app.post('/', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can create roles' });
    }

    const { name, permissions } = request.body as {
      name: string;
      permissions: string[];
    };

    if (!name) {
      return reply.status(400).send({ error: 'Role name is required' });
    }

    if (!Array.isArray(permissions)) {
      return reply.status(400).send({ error: 'Permissions must be an array' });
    }

    // Validate all permissions exist in categories
    const allPermissions = Object.values(PERMISSION_CATEGORIES).flat();
    const invalidPermissions = permissions.filter(p => !allPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return reply.status(400).send({
        error: 'Invalid permissions',
        invalidPermissions,
      });
    }

    const existingRole = await prismaAny.role.findFirst({ where: { name } });
    if (existingRole) {
      return reply.status(409).send({ error: 'Role with this name already exists' });
    }

    const role = await prismaAny.role.create({
      data: {
        name,
        permissions,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'role',
        resourceId: role.id,
        details: { name, permissions },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { data: role };
  });

  // Update role
  app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can update roles' });
    }

    const { id } = request.params;
    const { name, permissions } = request.body as {
      name?: string;
      permissions?: string[];
    };

    const role = await prismaAny.role.findUnique({ where: { id } });
    if (!role) {
      return reply.status(404).send({ error: 'Role not found' });
    }

    // Validate permissions if provided
    if (permissions) {
      const allPermissions = Object.values(PERMISSION_CATEGORIES).flat();
      const invalidPermissions = permissions.filter(p => !allPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return reply.status(400).send({
          error: 'Invalid permissions',
          invalidPermissions,
        });
      }
    }

    // Check name uniqueness if changing name
    if (name && name !== role.name) {
      const existing = await prismaAny.role.findFirst({ where: { name } });
      if (existing) {
        return reply.status(409).send({ error: 'Role with this name already exists' });
      }
    }

    const updated = await prismaAny.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'role',
        resourceId: id,
        details: { name: updated.name, permissions: updated.permissions },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { data: updated };
  });

  // Delete role
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can delete roles' });
    }

    const { id } = request.params;

    const role = await prismaAny.role.findUnique({ where: { id } });
    if (!role) {
      return reply.status(404).send({ error: 'Role not found' });
    }

    // Check if role is assigned to any users
    const usersWithRole = await prisma.user.count({ where: { role: role.name } as any });
    if (usersWithRole > 0) {
      return reply.status(400).send({
        error: 'Cannot delete role assigned to users',
        userCount: usersWithRole,
      });
    }

    await prismaAny.role.delete({ where: { id } });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'role',
        resourceId: id,
        details: { name: role.name },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { success: true };
  });
}
