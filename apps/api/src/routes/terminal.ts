import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const COMMAND_TIMEOUT = 10000;

function executeCommand(command: string): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    let adaptedCommand = command;

    // On Windows, replace 'ls' with 'dir' as fallback
    if (isWindows && /^ls(\s|$)/.test(command)) {
      adaptedCommand = command.replace(/^ls/, 'dir');
    }

    exec(adaptedCommand, { timeout: COMMAND_TIMEOUT, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          output: stderr || error.message,
          exitCode: error.code || 1,
        });
      } else {
        resolve({
          output: stdout || stderr || '',
          exitCode: 0,
        });
      }
    });
  });
}

export async function terminalRoutes(app: FastifyInstance) {
  // Create terminal session
  app.post('/sessions', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const session = await prisma.terminalSession.create({
      data: {
        userId: request.user.id,
        isActive: true,
        commandCount: 0,
        lastActivityAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'terminal_session',
        resourceId: session.id,
        details: {},
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { data: session };
  });

  // Close terminal session
  app.delete<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params;

    const session = await prisma.terminalSession.findUnique({ where: { id } });
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (session.userId !== request.user.id && request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await prisma.terminalSession.update({
      where: { id },
      data: { isActive: false },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'terminal_session',
        resourceId: id,
        details: { commandCount: session.commandCount },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return { success: true };
  });

  // List active terminal sessions
  app.get('/sessions', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const where: any = { isActive: true };

    // Non-owners can only see their own sessions
    if (request.user.role !== 'OWNER') {
      where.userId = request.user.id;
    }

    const sessions = await prisma.terminalSession.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return { data: sessions };
  });

  // Execute command in session
  app.post<{ Params: { id: string } }>('/sessions/:id/command', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params;
    const { command } = request.body as { command: string };

    if (!command) {
      return reply.status(400).send({ error: 'Command is required' });
    }

    const session = await prisma.terminalSession.findUnique({ where: { id } });
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!session.isActive) {
      return reply.status(400).send({ error: 'Session is closed' });
    }

    if (session.userId !== request.user.id && request.user.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const startTime = Date.now();
    const { output, exitCode } = await executeCommand(command);
    const executionTime = Date.now() - startTime;

    // Update session
    await prisma.terminalSession.update({
      where: { id },
      data: {
        commandCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    // Log command to audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'EXECUTE',
        resource: 'terminal_command',
        resourceId: id,
        details: {
          command,
          exitCode,
          executionTime,
          outputLength: output.length,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return {
      data: {
        output,
        exitCode,
        timestamp: new Date(),
        executionTime,
      },
    };
  });
}
