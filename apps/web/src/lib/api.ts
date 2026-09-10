import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'VIEWER';
  permissions: string[];
  createdAt: string;
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
  socialLinks: Record<string, unknown>;
}

export interface Application {
  id: string;
  name: string;
  type: string;
  slug: string;
  description: string;
  version: string;
  status: 'INSTALLED' | 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'ERROR' | 'RESTARTING' | 'INSTALLING' | 'UPDATING' | 'NOT_INSTALLED';
  config: Record<string, unknown>;
  installedAt: string | null;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
}

export interface DashboardData {
  system: {
    cpu: number;
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
    uptime: number;
    loadAverage: number[];
    platform: string;
    hostname: string;
  };
  applications: {
    total: number;
    running: number;
    stopped: number;
    error: number;
    list: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      cpu: number;
      ram: number;
    }>;
  };
  alerts: {
    unacknowledged: number;
  };
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    resource: string;
    timestamp: string;
  }>;
}

export interface VPSStats {
  total: number;
  running: number;
  stopped: number;
  suspended: number;
  totalMemory: number;
  totalDisk: number;
}

export interface MinecraftStats {
  total: number;
  running: number;
  offline: number;
  totalPlayers: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: { id: string; name: string; email: string };
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// Auth API
export const authApi = {
  checkSetup: () => api.get<{ needsSetup: boolean }>('/auth/setup'),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (email: string, password: string, name: string, panelName?: string) =>
    api.post<{ token: string; user: User }>('/auth/register', { email, password, name, panelName }),
  getMe: () => api.get<User>('/auth/me'),
};

// Branding API
export const brandingApi = {
  get: () => api.get<Branding>('/branding'),
  update: (data: Partial<Branding>) => api.put<Branding>('/branding', data),
};

// Applications API
export interface MarketplaceItem {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  installed: boolean;
}

export const applicationsApi = {
  list: () => api.get<Application[]>('/applications'),
  get: (id: string) => api.get<Application>(`/applications/${id}`),
  getMarketplace: () => api.get<MarketplaceItem[]>('/applications/marketplace'),
  update: (id: string, data?: Partial<Application>) =>
    api.put<Application>(`/applications/${id}`, data),
  install: (id: string) => api.post(`/applications/${id}/install`),
  start: (id: string) => api.post(`/applications/${id}/start`),
  stop: (id: string) => api.post(`/applications/${id}/stop`),
  restart: (id: string) => api.post(`/applications/${id}/restart`),
  uninstall: (id: string) => api.post(`/applications/${id}/uninstall`),
  logs: (id: string, limit?: number, offset?: number) =>
    api.get(`/applications/${id}/logs`, { params: { limit, offset } }),
  metrics: (id: string) => api.get(`/applications/${id}/metrics`),
  health: (id: string) => api.get(`/applications/${id}/health`),
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
  getMetrics: (period?: string) =>
    api.get('/dashboard/metrics', { params: { period } }),
};

// Settings API
export const settingsApi = {
  list: () => api.get<Record<string, Record<string, string>>>('/settings'),
  get: (key: string) => api.get<{ key: string; value: string }>(`/settings/${key}`),
  update: (key: string, value: string) =>
    api.put(`/settings/${key}`, { value }),
  bulkUpdate: (settings: Array<{ key: string; value: string }>) =>
    api.put('/settings', { settings }),
};

// Users API
export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Audit API
export const auditApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    resource?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
  stats: () => api.get('/audit/stats'),
};

// Performance API
export interface SystemMetrics {
  cpu: {
    cores: number;
    usage: number;
    loadAverage: number[];
    model: string;
    speed: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    percentage: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  uptime: number;
  hostname: string;
  platform: string;
  timestamp: string;
}

export interface MetricDataPoint {
  id: string;
  source: string;
  metric: string;
  value: number;
  tags: Record<string, unknown>;
  timestamp: string;
}

export const performanceApi = {
  getCurrent: () => api.get<SystemMetrics>('/performance/current'),
  getHistory: (period?: string, source?: string) =>
    api.get<MetricDataPoint[]>('/performance/history', { params: { period, source } }),
};

// Alerts API
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  duration: number;
  enabled: boolean;
  notify: string[];
}

export const alertsApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    severity?: string;
    acknowledged?: string;
  }) => api.get<{ alerts: Alert[]; total: number }>('/alerts', { params }),
  stats: () => api.get('/alerts/stats'),
  acknowledge: (id: string) => api.put(`/alerts/${id}/acknowledge`),
  delete: (id: string) => api.delete(`/alerts/${id}`),
  clearAcknowledged: () => api.delete('/alerts/clear/acknowledged'),
  getRules: () => api.get<AlertRule[]>('/alerts/rules'),
  createRule: (data: Omit<AlertRule, 'id'>) => api.post<AlertRule>('/alerts/rules', data),
  updateRule: (id: string, data: Omit<AlertRule, 'id'>) =>
    api.put<AlertRule>(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
};

// Health Checks API
export interface HealthCheck {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'process' | 'docker';
  target: string;
  port?: number;
  interval: number;
  timeout: number;
  enabled: boolean;
}

export interface HealthCheckResult {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  message: string;
  responseTime: number;
}

export const healthChecksApi = {
  list: () => api.get<HealthCheck[]>('/healthchecks'),
  create: (data: Omit<HealthCheck, 'id'>) => api.post<HealthCheck>('/healthchecks', data),
  update: (id: string, data: Omit<HealthCheck, 'id'>) =>
    api.put<HealthCheck>(`/healthchecks/${id}`, data),
  delete: (id: string) => api.delete(`/healthchecks/${id}`),
  run: (id: string) => api.post<HealthCheckResult>(`/healthchecks/${id}/run`),
  getHistory: (id: string, limit?: number) =>
    api.get(`/healthchecks/${id}/history`, { params: { limit } }),
  runAll: () => api.post<HealthCheckResult[]>('/healthchecks/run-all'),
};

// VPS API
export interface VPSInstance {
  token: string;
  vpsId: string;
  containerId: string;
  memory: number;
  cpu: number;
  disk: number;
  username: string;
  password: string;
  rootPassword?: string;
  createdBy: string;
  createdAt: string;
  tmateSession?: string;
  watermark: string;
  osImage: string;
  restartCount: number;
  lastRestart?: string;
  status: 'running' | 'stopped' | 'suspended' | 'creating' | 'error';
  useCustomImage: boolean;
}

export interface CreateVPSParams {
  memory: number;
  cpu: number;
  disk: number;
  ownerId: string;
  osImage?: string;
  useCustomImage?: boolean;
}

export const vpsApi = {
  list: () => api.get<VPSInstance[]>('/vps'),
  get: (id: string) => api.get<VPSInstance>(`/vps/${id}`),
  create: (data: CreateVPSParams) => api.post<VPSInstance>('/vps', data),
  start: (id: string) => api.post(`/vps/${id}/start`),
  stop: (id: string) => api.post(`/vps/${id}/stop`),
  restart: (id: string) => api.post(`/vps/${id}/restart`),
  delete: (id: string) => api.delete(`/vps/${id}`),
  suspend: (id: string) => api.post(`/vps/${id}/suspend`),
  unsuspend: (id: string) => api.post(`/vps/${id}/unsuspend`),
  transfer: (id: string, newOwnerId: string) =>
    api.post(`/vps/${id}/transfer`, { newOwnerId }),
  changePassword: (id: string) => api.post<{ password: string }>(`/vps/${id}/password`),
  getStats: () => api.get<VPSStats>('/vps/stats'),
  getMetrics: (id: string) => api.get(`/vps/${id}/metrics`),
};

// Docker API
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  state: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdAt: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export const dockerApi = {
  check: () => api.get<{ available: boolean }>('/docker/check'),
  listContainers: () => api.get<DockerContainer[]>('/docker/containers'),
  listImages: () => api.get<DockerImage[]>('/docker/images'),
  listVolumes: () => api.get<DockerVolume[]>('/docker/volumes'),
  listNetworks: () => api.get<DockerNetwork[]>('/docker/networks'),
  startContainer: (id: string) => api.post(`/docker/containers/${id}/start`),
  stopContainer: (id: string) => api.post(`/docker/containers/${id}/stop`),
  restartContainer: (id: string) => api.post(`/docker/containers/${id}/restart`),
  removeContainer: (id: string) => api.post(`/docker/containers/${id}/remove`),
  getContainerLogs: (id: string, lines?: number) =>
    api.get(`/docker/containers/${id}/logs`, { params: { lines } }),
  getContainerStats: (id: string) => api.get(`/docker/containers/${id}/stats`),
  removeImage: (id: string) => api.post(`/docker/images/${id}/remove`),
  removeVolume: (name: string) => api.post(`/docker/volumes/${name}/remove`),
  prune: () => api.post('/docker/prune'),
};

// Status Page API
export interface StatusService {
  id: string;
  name: string;
  description?: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  url?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  message: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  serviceId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Maintenance {
  id: string;
  title: string;
  message: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  serviceId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const statusPageApi = {
  getPublic: () => api.get('/statuspage/public'),
  getServices: () => api.get<StatusService[]>('/statuspage/services'),
  createService: (data: Omit<StatusService, 'id' | 'createdAt'>) =>
    api.post<StatusService>('/statuspage/services', data),
  updateService: (id: string, data: Partial<StatusService>) =>
    api.put<StatusService>(`/statuspage/services/${id}`, data),
  deleteService: (id: string) => api.delete(`/statuspage/services/${id}`),
  getIncidents: () => api.get<Incident[]>('/statuspage/incidents'),
  createIncident: (data: Omit<Incident, 'id' | 'createdAt' | 'resolvedAt'>) =>
    api.post<Incident>('/statuspage/incidents', data),
  updateIncident: (id: string, data: Partial<Incident>) =>
    api.put<Incident>(`/statuspage/incidents/${id}`, data),
  getMaintenance: () => api.get<Maintenance[]>('/statuspage/maintenance'),
  createMaintenance: (data: Omit<Maintenance, 'id' | 'createdAt' | 'startedAt' | 'completedAt'>) =>
    api.post<Maintenance>('/statuspage/maintenance', data),
  updateMaintenance: (id: string, data: Partial<Maintenance>) =>
    api.put<Maintenance>(`/statuspage/maintenance/${id}`, data),
};

// Minecraft API
export interface MinecraftServer {
  id: string;
  name: string;
  nodeId?: string;
  software: string;
  version: string;
  port: number;
  status: string;
  maxPlayers: number;
  onlinePlayers: number;
  cpuUsage: number;
  ramUsage: number;
  ramAllocated: number;
  diskUsage: number;
  uptime: number;
  containerId?: string;
  createdAt: string;
}

export interface MinecraftNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  maxMemory: number;
  usedMemory: number;
  cpuCores: number;
  serverCount: number;
  lastPing?: string;
  createdAt: string;
}

export const minecraftApi = {
  list: () => api.get<MinecraftServer[]>('/minecraft'),
  get: (id: string) => api.get<MinecraftServer>(`/minecraft/${id}`),
  getStats: () => api.get<MinecraftStats>('/minecraft/stats'),
  create: (data: { name: string; software: string; version: string; port: number; maxPlayers: number; nodeId?: string }) =>
    api.post<MinecraftServer>('/minecraft', data),
  update: (id: string, data: Partial<MinecraftServer>) => api.put(`/minecraft/${id}`, data),
  delete: (id: string) => api.delete(`/minecraft/${id}`),
  start: (id: string) => api.post(`/minecraft/${id}/start`),
  stop: (id: string) => api.post(`/minecraft/${id}/stop`),
  restart: (id: string) => api.post(`/minecraft/${id}/restart`),
  listNodes: () => api.get<MinecraftNode[]>('/minecraft/nodes'),
  createNode: (data: { name: string; host: string; port: number; token: string }) =>
    api.post<MinecraftNode>('/minecraft/nodes', data),
  updateNode: (id: string, data: Partial<MinecraftNode>) => api.put(`/minecraft/nodes/${id}`, data),
  deleteNode: (id: string) => api.delete(`/minecraft/nodes/${id}`),
};

// Campaign API
export interface Campaign {
  id: string;
  name: string;
  message: string;
  embedJson?: unknown;
  targetType: string;
  targetId?: string;
  scheduledAt?: string;
  status: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  botId?: string;
  createdAt: string;
}

export const campaignApi = {
  list: (params?: { limit?: number; offset?: number; status?: string }) =>
    api.get('/campaigns', { params }),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  getStats: () => api.get('/campaigns/stats'),
  create: (data: { name: string; message: string; embedJson?: unknown; targetType: string; targetId?: string; scheduledAt?: string; botId?: string }) =>
    api.post<Campaign>('/campaigns', data),
  update: (id: string, data: Partial<Campaign>) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  send: (id: string) => api.post(`/campaigns/${id}/send`),
  cancel: (id: string) => api.post(`/campaigns/${id}/cancel`),
};

// Broadcast API
export interface BroadcastMessage {
  id: string;
  botId: string;
  channelId: string;
  content: string;
  embedJson?: unknown;
  status: string;
  sentCount: number;
  failedCount: number;
  totalTargets: number;
  rateLimitPerSec: number;
  createdAt: string;
  completedAt?: string;
}

export const broadcastApi = {
  list: () => api.get<BroadcastMessage[]>('/broadcasts'),
  create: (data: { botId: string; channelId: string; content: string; embedJson?: unknown; rateLimitPerSec?: number }) =>
    api.post<BroadcastMessage>('/broadcasts', data),
  send: (id: string) => api.post(`/broadcasts/${id}/send`),
  cancel: (id: string) => api.post(`/broadcasts/${id}/cancel`),
  delete: (id: string) => api.delete(`/broadcasts/${id}`),
};

// Embed API
export const embedApi = {
  preview: (data: { title?: string; description?: string; color?: string; author?: { name?: string; icon_url?: string }; footer?: { text?: string; icon_url?: string }; thumbnail?: { url?: string }; image?: { url?: string }; fields?: Array<{ name: string; value: string; inline?: boolean }>; url?: string; timestamp?: boolean }) =>
    api.post('/embeds/preview', data),
  validate: (data: Record<string, unknown>) => api.post('/embeds/validate', data),
};

// Discord Analytics API
export const discordAnalyticsApi = {
  getOverview: () => api.get('/discord-analytics/overview'),
  getBotAnalytics: (botId: string) => api.get(`/discord-analytics/${botId}`),
  collect: () => api.post('/discord-analytics/collect'),
  getHistory: (params?: { period?: string; botId?: string }) =>
    api.get('/discord-analytics/history', { params }),
};

// Roles API
export interface Role {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

export const rolesApi = {
  list: () => api.get<Role[]>('/roles'),
  getPermissions: () => api.get('/roles/permissions'),
  create: (data: { name: string; permissions: string[] }) => api.post<Role>('/roles', data),
  update: (id: string, data: { name?: string; permissions?: string[] }) => api.put<Role>(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

// Terminal API
export interface TerminalSession {
  id: string;
  userId: string;
  isActive: boolean;
  commandCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export const terminalApi = {
  createSession: () => api.post<TerminalSession>('/terminal/sessions'),
  closeSession: (id: string) => api.delete(`/terminal/sessions/${id}`),
  listSessions: () => api.get<TerminalSession[]>('/terminal/sessions'),
  executeCommand: (sessionId: string, command: string) =>
    api.post<{ output: string; exitCode: number; timestamp: string }>(`/terminal/sessions/${sessionId}/command`, { command }),
};

export { api };
export default api;
