import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = '/opt/ones-panel/backups';

export async function backupRoutes(app: FastifyInstance) {
  // Get all backups
  app.get('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const files = await fs.readdir(BACKUP_DIR);
      
      const backups = [];
      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.json')) {
          const stats = await fs.stat(path.join(BACKUP_DIR, file));
          backups.push({
            id: file,
            name: file,
            size: stats.size,
            createdAt: stats.birthtime,
            type: file.endsWith('.sql') ? 'database' : 'config',
          });
        }
      }

      return backups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to list backups', details: err.message });
    }
  });

  // Create database backup
  app.post('/database', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can create backups' });
    }

    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `database-${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      const dbUrl = process.env.DATABASE_URL || '';
      const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      
      if (!match) {
        return reply.status(500).send({ error: 'Invalid database URL' });
      }

      const [, user, password, host, port, database] = match;
      
      await execAsync(
        `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -f ${filepath}`
      );

      const stats = await fs.stat(filepath);

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'CREATE',
          resource: 'backup',
          resourceId: filename,
          details: { type: 'database', size: stats.size },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return {
        id: filename,
        name: filename,
        size: stats.size,
        createdAt: new Date(),
        type: 'database',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Backup failed', details: err.message });
    }
  });

  // Create config backup
  app.post('/config', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can create backups' });
    }

    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `config-${timestamp}.json`;
      const filepath = path.join(BACKUP_DIR, filename);

      // Export settings and branding
      const settings = await prisma.setting.findMany();
      const branding = await prisma.branding.findFirst();
      const applications = await prisma.application.findMany();

      const backupData = {
        settings: settings.map(s => ({ key: s.key, value: s.value, category: s.category })),
        branding,
        applications: applications.map(a => ({
          name: a.name,
          type: a.type,
          slug: a.slug,
          description: a.description,
          config: a.config,
        })),
        createdAt: new Date(),
      };

      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

      const stats = await fs.stat(filepath);

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'CREATE',
          resource: 'backup',
          resourceId: filename,
          details: { type: 'config', size: stats.size },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return {
        id: filename,
        name: filename,
        size: stats.size,
        createdAt: new Date(),
        type: 'config',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Backup failed', details: err.message });
    }
  });

  // Download backup
  app.get('/:id/download', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const filepath = path.join(BACKUP_DIR, id);

    try {
      await fs.access(filepath);
      const data = await fs.readFile(filepath);
      return reply.send(data);
    } catch {
      return reply.status(404).send({ error: 'Backup not found' });
    }
  });

  // Delete backup
  app.delete('/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can delete backups' });
    }

    const { id } = request.params as { id: string };
    const filepath = path.join(BACKUP_DIR, id);

    try {
      await fs.unlink(filepath);

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'DELETE',
          resource: 'backup',
          resourceId: id,
          details: {},
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to delete backup', details: err.message });
    }
  });

  // Restore backup
  app.post('/:id/restore', async (request, reply) => {
    if (!request.user || request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Only owners can restore backups' });
    }

    const { id } = request.params as { id: string };
    const filepath = path.join(BACKUP_DIR, id);

    try {
      await fs.access(filepath);

      if (id.endsWith('.sql')) {
        // Restore database
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        
        if (!match) {
          return reply.status(500).send({ error: 'Invalid database URL' });
        }

        const [, user, password, host, port, database] = match;
        
        await execAsync(
          `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -f ${filepath}`
        );
      } else if (id.endsWith('.json')) {
        // Restore config
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);

        // Restore settings
        for (const setting of data.settings || []) {
          await prisma.setting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: { key: setting.key, value: setting.value, category: setting.category },
          });
        }

        // Restore branding
        if (data.branding) {
          await prisma.branding.upsert({
            where: { id: 'default' },
            update: data.branding,
            create: { id: 'default', ...data.branding },
          });
        }
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'RESTORE',
          resource: 'backup',
          resourceId: id,
          details: {},
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
        },
      });

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Restore failed', details: err.message });
    }
  });
}
