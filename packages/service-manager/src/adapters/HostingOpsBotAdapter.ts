import { BaseServiceAdapter, HealthCheckResult } from './BaseAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface HostingOpsBotConfig {
  installPath: string;
  token?: string;
  guildId?: string;
  welcomeChannelId?: string;
  announcementChannelId?: string;
  [key: string]: unknown;
}

export class HostingOpsBotAdapter extends BaseServiceAdapter {
  private config: HostingOpsBotConfig;

  constructor(config: HostingOpsBotConfig) {
    super({
      installPath: config.installPath || '/opt/ones-panel/services/hosting-ops-bot',
      serviceName: 'hosting-ops-bot',
      processName: 'hosting-ops-bot',
    });
    this.config = config;
  }

  async install(): Promise<void> {
    await this.ensureInstallPath();

    console.log('Installing Hosting Operations Bot...');

    const packageJson = {
      name: 'ones-panel-hosting-ops-bot',
      version: '1.0.0',
      scripts: {
        start: 'node bot.js',
        dev: 'node bot.js',
      },
      dependencies: {
        'discord.js': '^14.14.0',
      },
    };

    await fs.writeFile(
      path.join(this.installPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const botTemplate = `
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

const CONFIG_FILE = path.join(__dirname, 'config.json');
const DATA_FILE = path.join(__dirname, 'data.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {}
  return {
    tickets: [],
    announcements: [],
    campaigns: [],
    welcomeSettings: {},
    dmSettings: {},
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

client.once('ready', () => {
  console.log('Hosting Operations Bot is ready!');
  console.log('Logged in as ' + client.user.tag);
});

client.on('guildMemberAdd', async (member) => {
  const config = loadConfig();
  const data = loadData();
  
  if (config.welcomeChannelId && config.welcomeMessage) {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle('Welcome!')
        .setDescription(config.welcomeMessage.replace('{user}', member.toString()))
        .setColor(0x3b82f6)
        .setTimestamp();
      
      if (config.welcomeImageUrl) {
        embed.setImage(config.welcomeImageUrl);
      }
      
      await channel.send({ embeds: [embed] });
    }
  }
  
  if (config.welcomeDM) {
    try {
      await member.send(config.welcomeDM.replace('{user}', member.toString()));
    } catch {}
  }
  
  data.analytics = data.analytics || {};
  data.analytics.newMembers = (data.analytics.newMembers || 0) + 1;
  saveData(data);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('/')) return;

  const args = message.content.slice(1).split(/\\s+/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'ticket':
      await handleTicket(message, args);
      break;
    case 'announce':
      await handleAnnounce(message, args);
      break;
    case 'status':
      await handleStatus(message);
      break;
    case 'help':
      await handleHelp(message);
      break;
  }
});

async function handleTicket(message, args) {
  const action = args[0];
  const data = loadData();
  
  if (action === 'create') {
    const ticket = {
      id: Date.now().toString(),
      userId: message.author.id,
      status: 'open',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    data.tickets.push(ticket);
    saveData(data);
    await message.reply('Ticket created. ID: ' + ticket.id);
  } else if (action === 'close') {
    const ticketId = args[1];
    const ticket = data.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'closed';
      saveData(data);
      await message.reply('Ticket ' + ticketId + ' closed.');
    } else {
      await message.reply('Ticket not found.');
    }
  } else {
    await message.reply('Usage: /ticket [create|close] [id]');
  }
}

async function handleAnnounce(message, args) {
  const config = loadConfig();
  
  if (!config.announcementChannelId) {
    await message.reply('Announcement channel not configured.');
    return;
  }
  
  const announcement = args.join(' ');
  if (!announcement) {
    await message.reply('Usage: /announce <message>');
    return;
  }
  
  const channel = message.guild.channels.cache.get(config.announcementChannelId);
  if (!channel) {
    await message.reply('Announcement channel not found.');
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('Announcement')
    .setDescription(announcement)
    .setColor(0x3b82f6)
    .setTimestamp()
    .setFooter({ text: 'By ' + message.author.tag });
  
  await channel.send({ embeds: [embed] });
  await message.reply('Announcement sent!');
}

async function handleStatus(message) {
  const embed = new EmbedBuilder()
    .setTitle('System Status')
    .addFields(
      { name: 'Bot Status', value: 'Online', inline: true },
      { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
      { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true }
    )
    .setColor(0x22c55e)
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setTitle('Commands')
    .setDescription('Available commands')
    .addFields(
      { name: '/ticket create', value: 'Create a support ticket' },
      { name: '/ticket close <id>', value: 'Close a ticket' },
      { name: '/announce <message>', value: 'Send an announcement' },
      { name: '/status', value: 'View bot status' },
      { name: '/help', value: 'Show this help' }
    )
    .setColor(0x3b82f6);
  
  await message.reply({ embeds: [embed] });
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return days + 'd ' + (hours % 24) + 'h ' + (minutes % 60) + 'm';
}

const config = loadConfig();
const token = process.env.DISCORD_TOKEN || config.token;

if (!token) {
  console.error('No Discord token provided. Set DISCORD_TOKEN or config.json token.');
  process.exit(1);
}

client.login(token);
`;

    await fs.writeFile(path.join(this.installPath, 'bot.js'), botTemplate);

    if (this.config.token) {
      await this.writeConfig({
        token: this.config.token,
        guildId: this.config.guildId,
        welcomeChannelId: this.config.welcomeChannelId,
        announcementChannelId: this.config.announcementChannelId,
      });
    }

    await execAsync('npm install', { cwd: this.installPath });
    console.log('Hosting Operations Bot installed successfully');
  }

  async start(): Promise<void> {
    await execAsync('pm2 start bot.js --name hosting-ops-bot', {
      cwd: this.installPath,
    });
  }

  async stop(): Promise<void> {
    try {
      await execAsync('pm2 stop hosting-ops-bot');
    } catch {
      await execAsync('pkill -f hosting-ops-bot', { timeout: 5000 }).catch(() => {});
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async update(): Promise<void> {
    await execAsync('npm update', { cwd: this.installPath });
    await this.restart();
  }

  async uninstall(): Promise<void> {
    await this.stop();
    try {
      await execAsync('pm2 delete hosting-ops-bot');
    } catch {}
    await execAsync(`rm -rf ${this.installPath}`);
  }

  async getStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('pm2 status --no-colors 2>/dev/null || true');
      if (stdout.includes('hosting-ops-bot') && stdout.includes('online')) return 'RUNNING';
      if (stdout.includes('hosting-ops-bot') && stdout.includes('stopped')) return 'STOPPED';
      return 'STOPPED';
    } catch {
      const pid = await this.getPid();
      return pid ? 'RUNNING' : 'STOPPED';
    }
  }

  async health(): Promise<HealthCheckResult> {
    const status = await this.getStatus();
    
    if (status === 'RUNNING') {
      try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:3001/api/bots/hosting-ops/health', {
          signal: AbortSignal.timeout(5000),
        });
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          return { status: 'HEALTHY', message: 'Bot is connected', responseTime };
        }
        return { status: 'WARNING', message: 'Bot health check failed', responseTime };
      } catch {
        return { status: 'WARNING', message: 'Health check endpoint unavailable', responseTime: 0 };
      }
    }
    
    return { status: 'CRITICAL', message: 'Bot not running', responseTime: 0 };
  }
}
