import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient, UserRole, ApplicationType, ServiceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create owner user
  const ownerPassword = await bcrypt.hash('admin123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'admin@onespanel.com' },
    update: {},
    create: {
      email: 'admin@onespanel.com',
      passwordHash: ownerPassword,
      name: 'Admin',
      role: UserRole.OWNER,
      permissions: Object.values(UserRole).map(() => '*'),
    },
  });
  console.log('Created owner user:', owner.email);

  // Create default branding
  const branding = await prisma.branding.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      panelName: 'ONES PANEL',
      companyName: 'Ones Panel',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      accentColor: '#60a5fa',
      backgroundColor: '#0f172a',
      browserTitle: 'ONES PANEL',
      footerText: 'Powered by Ones Panel',
    },
  });
  console.log('Created default branding:', branding.panelName);

  // Create default applications
  const applications = [
    {
      name: 'JTG',
      type: ApplicationType.JTG,
      slug: 'jtg',
      description: 'Minecraft server management panel',
      version: '1.0.0',
      status: ServiceStatus.NOT_INSTALLED,
    },
    {
      name: 'Status Page',
      type: ApplicationType.STATUS_PAGE,
      slug: 'status-page',
      description: 'Public status page for services',
      version: '1.0.0',
      status: ServiceStatus.NOT_INSTALLED,
    },
    {
      name: 'VPS Deploy Bot',
      type: ApplicationType.VPS_DEPLOY_BOT,
      slug: 'vps-deploy-bot',
      description: 'Discord bot for VPS deployment',
      version: '1.0.0',
      status: ServiceStatus.NOT_INSTALLED,
    },
    {
      name: 'Hosting Operations Bot',
      type: ApplicationType.HOSTING_OPS_BOT,
      slug: 'hosting-ops-bot',
      description: 'Discord bot for hosting operations',
      version: '1.0.0',
      status: ServiceStatus.NOT_INSTALLED,
    },
  ];

  for (const app of applications) {
    const existing = await prisma.application.findUnique({
      where: { slug: app.slug },
    });

    if (!existing) {
      await prisma.application.create({ data: app });
      console.log('Created application:', app.name);
    }
  }

  // Create default settings
  const settings = [
    { key: 'app.installed', value: 'false', category: 'system' },
    { key: 'app.version', value: '1.0.0', category: 'system' },
    { key: 'monitoring.enabled', value: 'true', category: 'monitoring' },
    { key: 'monitoring.interval', value: '30', category: 'monitoring' },
    { key: 'alerts.enabled', value: 'true', category: 'alerts' },
    { key: 'backups.enabled', value: 'true', category: 'backups' },
    { key: 'backups.retention_days', value: '30', category: 'backups' },
  ];

  for (const setting of settings) {
    const existing = await prisma.setting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.setting.create({ data: setting });
    }
  }
  console.log('Created default settings');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
