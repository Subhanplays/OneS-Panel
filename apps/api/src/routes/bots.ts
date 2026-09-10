import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const botProcesses = new Map<string, any>();

export async function botsRoutes(app: FastifyInstance) {
  // List all Discord bots
  app.get('/', async () => {
    const bots = await prisma.discordBot.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { data: bots };
  });

  // Get bot by ID
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    return { data: bot };
  });

  // Create new bot
  app.post('/', async (request, reply) => {
    const body = request.body as any;
    const { name, token, guildId, features, config } = body;

    if (!name || !token) {
      return reply.status(400).send({ error: 'Name and token are required' });
    }

    const bot = await prisma.discordBot.create({
      data: {
        name,
        token,
        guildId: guildId || null,
        applicationId: body.applicationId || `bot-${Date.now()}`,
        features: features || [],
        config: config || {},
      },
    });

    return { data: bot };
  });

  // Update bot
  app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body as any;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const updated = await prisma.discordBot.update({
      where: { id },
      data,
    });

    return { data: updated };
  });

  // Delete bot
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    if (botProcesses.has(id)) {
      try { botProcesses.get(id).kill(); } catch {}
      botProcesses.delete(id);
    }

    await prisma.discordBot.delete({
      where: { id },
    });

    return { success: true };
  });

  // Toggle bot enabled/disabled
  app.post<{ Params: { id: string } }>('/:id/toggle', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({
      where: { id },
    });

    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const updated = await prisma.discordBot.update({
      where: { id },
      data: { enabled: !bot.enabled },
    });

    return { data: updated };
  });

  // Start bot
  app.post<{ Params: { id: string } }>('/:id/start', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    if (botProcesses.has(id)) {
      return { success: true, message: 'Bot already running' };
    }

    const installPath = `/opt/ones-panel/services/${bot.applicationId}`;
    const mainFile = path.join(installPath, 'index.js');

    if (!fs.existsSync(mainFile)) {
      return reply.status(400).send({ error: 'Bot not installed yet. Run install first.' });
    }

    const env = {
      ...process.env,
      DISCORD_TOKEN: bot.token,
      GUILD_ID: bot.guildId || '',
      BOT_NAME: bot.name,
    };

    const child = spawn('node', [mainFile], { env, cwd: installPath, stdio: 'pipe' });
    botProcesses.set(id, child);

    child.on('exit', () => { botProcesses.delete(id); });
    child.on('error', () => { botProcesses.delete(id); });

    await prisma.discordBot.update({ where: { id }, data: { enabled: true } });

    return { success: true, message: 'Bot started' };
  });

  // Stop bot
  app.post<{ Params: { id: string } }>('/:id/stop', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    if (botProcesses.has(id)) {
      try { botProcesses.get(id).kill(); } catch {}
      botProcesses.delete(id);
    }

    await prisma.discordBot.update({ where: { id }, data: { enabled: false } });

    return { success: true, message: 'Bot stopped' };
  });

  // Install bot
  app.post<{ Params: { id: string } }>('/:id/install', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const installPath = `/opt/ones-panel/services/${bot.applicationId}`;
    fs.mkdirSync(installPath, { recursive: true });

    if (!fs.existsSync(path.join(installPath, 'package.json'))) {
      fs.writeFileSync(path.join(installPath, 'package.json'), JSON.stringify({
        name: bot.name,
        version: '1.0.0',
        private: true,
        main: 'index.js',
        dependencies: { 'discord.js': '^14.0.0' },
      }, null, 2));
    }

    if (!fs.existsSync(path.join(installPath, 'index.js'))) {
      const feature = bot.features?.[0] || 'vps-deploy';
      fs.writeFileSync(path.join(installPath, 'index.js'), `const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(\`\${process.env.BOT_NAME} is ready as \${client.user.tag}\`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN);`);
    }

    await prisma.discordBot.update({
      where: { id },
      data: { enabled: false },
    });

    return { success: true, message: 'Bot installed', installPath };
  });

  // Restart bot
  app.post<{ Params: { id: string } }>('/:id/restart', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    if (botProcesses.has(id)) {
      try { botProcesses.get(id).kill(); } catch {}
      botProcesses.delete(id);
    }

    const installPath = `/opt/ones-panel/services/${bot.applicationId}`;
    const mainFile = path.join(installPath, 'index.js');

    if (!fs.existsSync(mainFile)) {
      return reply.status(400).send({ error: 'Bot not installed' });
    }

    const env = {
      ...process.env,
      DISCORD_TOKEN: bot.token,
      GUILD_ID: bot.guildId || '',
      BOT_NAME: bot.name,
    };

    const child = spawn('node', [mainFile], { env, cwd: installPath, stdio: 'pipe' });
    botProcesses.set(id, child);
    child.on('exit', () => { botProcesses.delete(id); });
    child.on('error', () => { botProcesses.delete(id); });

    return { success: true, message: 'Bot restarted' };
  });

  // Get bot logs
  app.get<{ Params: { id: string } }>('/:id/logs', async (request, reply) => {
    const { id } = request.params;

    const bot = await prisma.discordBot.findUnique({ where: { id } });
    if (!bot) {
      return reply.status(404).send({ error: 'Bot not found' });
    }

    const logFile = `/opt/ones-panel/services/${bot.applicationId}/bot.log`;

    if (!fs.existsSync(logFile)) {
      return { data: 'No logs available.' };
    }

    const logs = fs.readFileSync(logFile, 'utf-8').split('\n').slice(-100).join('\n');
    return { data: logs };
  });
}
