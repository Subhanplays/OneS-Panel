export { BaseServiceAdapter, ServiceAdapter, ServiceMetrics, HealthCheckResult } from './BaseAdapter';
export { JTGAdapter } from './adapters/JTGAdapter';
export { StatusPageAdapter } from './adapters/StatusPageAdapter';
export { VPSDeployBotAdapter, VPSDeployBotConfig } from './adapters/VPSDeployBotAdapter';
export { HostingOpsBotAdapter } from './adapters/HostingOpsBotAdapter';

import { ServiceAdapter } from './BaseAdapter';
import { JTGAdapter, JTGConfig } from './adapters/JTGAdapter';
import { StatusPageAdapter, StatusPageConfig } from './adapters/StatusPageAdapter';
import { VPSDeployBotAdapter, VPSDeployBotConfig } from './adapters/VPSDeployBotAdapter';
import { HostingOpsBotAdapter, HostingOpsBotConfig } from './adapters/HostingOpsBotAdapter';

export type AdapterType = 'jtg' | 'status-page' | 'vps-deploy-bot' | 'hosting-ops-bot';

export interface AdapterConfig {
  installPath?: string;
  port?: number;
  token?: string;
  guildId?: string;
  welcomeChannelId?: string;
  announcementChannelId?: string;
  [key: string]: unknown;
}

export function createAdapter(type: AdapterType, config: AdapterConfig): ServiceAdapter {
  const installPath = config.installPath || `/opt/ones-panel/services/${type}`;
  
  switch (type) {
    case 'jtg':
      return new JTGAdapter({
        installPath,
        port: config.port || 3000,
        nodeEnv: 'production',
      });
    
    case 'status-page':
      return new StatusPageAdapter({
        installPath,
        port: config.port || 3002,
      });
    
    case 'vps-deploy-bot':
      return new VPSDeployBotAdapter({
        installPath,
        token: config.token,
        guildId: config.guildId,
      });
    
    case 'hosting-ops-bot':
      return new HostingOpsBotAdapter({
        installPath,
        token: config.token,
        guildId: config.guildId,
        welcomeChannelId: config.welcomeChannelId,
        announcementChannelId: config.announcementChannelId,
      });
    
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

export function getAvailableAdapters(): Array<{
  type: AdapterType;
  name: string;
  description: string;
  defaultPort: number;
}> {
  return [
    {
      type: 'jtg',
      name: 'JTG',
      description: 'Minecraft server management panel',
      defaultPort: 3000,
    },
    {
      type: 'status-page',
      name: 'Status Page',
      description: 'Public status page for your services',
      defaultPort: 3002,
    },
    {
      type: 'vps-deploy-bot',
      name: 'VPS Deploy Bot',
      description: 'Discord bot for VPS deployment and management',
      defaultPort: 0,
    },
    {
      type: 'hosting-ops-bot',
      name: 'Hosting Operations Bot',
      description: 'Discord bot for hosting operations and community management',
      defaultPort: 0,
    },
  ];
}
