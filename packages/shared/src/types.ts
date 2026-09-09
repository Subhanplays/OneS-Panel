import { UserRole, ServiceStatus, ApplicationType, HealthStatus, AlertSeverity, LogLevel, IncidentStatus, MaintenanceStatus } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Branding {
  id: string;
  panelName: string;
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  loginBackgroundUrl: string | null;
  browserTitle: string;
  footerText: string;
  supportUrl: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  docsUrl: string | null;
}

export interface Application {
  id: string;
  name: string;
  type: ApplicationType;
  description: string;
  version: string;
  status: ServiceStatus;
  config: Record<string, unknown>;
  installedAt: Date | null;
  lastStartedAt: Date | null;
  lastStoppedAt: Date | null;
  lastUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceMetrics {
  cpu: number;
  ram: number;
  ramUsed: number;
  ramTotal: number;
  disk: number;
  diskUsed: number;
  diskTotal: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  pid: number | null;
}

export interface HealthCheck {
  id: string;
  serviceId: string;
  status: HealthStatus;
  message: string;
  checkedAt: Date;
  responseTime: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface SystemMetrics {
  cpu: number;
  ram: number;
  ramUsed: number;
  ramTotal: number;
  disk: number;
  diskUsed: number;
  diskTotal: number;
  networkRx: number;
  networkTx: number;
  loadAverage: number[];
  uptime: number;
  timestamp: Date;
}

export interface Backup {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  expiresAt: Date | null;
}

export interface Incident {
  id: string;
  title: string;
  message: string;
  status: IncidentStatus;
  serviceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface Maintenance {
  id: string;
  title: string;
  message: string;
  status: MaintenanceStatus;
  serviceId: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface DiscordBotConfig {
  id: string;
  applicationId: string;
  token: string;
  guildId: string | null;
  welcomeChannelId: string | null;
  announcementChannelId: string | null;
  ticketCategoryId: string | null;
  enabled: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}
