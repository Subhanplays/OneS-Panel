export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  VIEWER = 'VIEWER',
}

export enum Permission {
  VPS_VIEW = 'vps.view',
  VPS_MANAGE = 'vps.manage',
  APPLICATIONS_VIEW = 'applications.view',
  APPLICATIONS_MANAGE = 'applications.manage',
  BOTS_VIEW = 'bots.view',
  BOTS_MANAGE = 'bots.manage',
  MINECRAFT_VIEW = 'minecraft.view',
  MINECRAFT_MANAGE = 'minecraft.manage',
  LOGS_VIEW = 'logs.view',
  TERMINAL_USE = 'terminal.use',
  SETTINGS_MANAGE = 'settings.manage',
  USERS_MANAGE = 'users.manage',
  BACKUPS_MANAGE = 'backups.manage',
  BRANDING_MANAGE = 'branding.manage',
  ALERTS_MANAGE = 'alerts.manage',
  MONITORING_VIEW = 'monitoring.view',
  DOCKER_MANAGE = 'docker.manage',
  AUDIT_VIEW = 'audit.view',
}

export enum ServiceStatus {
  INSTALLED = 'INSTALLED',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  STOPPING = 'STOPPING',
  ERROR = 'ERROR',
  RESTARTING = 'RESTARTING',
  INSTALLING = 'INSTALLING',
  UPDATING = 'UPDATING',
  NOT_INSTALLED = 'NOT_INSTALLED',
}

export enum ApplicationType {
  JTG = 'JTG',
  STATUS_PAGE = 'STATUS_PAGE',
  VPS_DEPLOY_BOT = 'VPS_DEPLOY_BOT',
  HOSTING_OPS_BOT = 'HOSTING_OPS_BOT',
  CUSTOM = 'CUSTOM',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum IncidentStatus {
  INVESTIGATING = 'INVESTIGATING',
  IDENTIFIED = 'IDENTIFIED',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
