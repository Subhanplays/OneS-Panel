import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export const statusColors: Record<string, string> = {
  RUNNING: 'text-green-500 bg-green-500/10',
  STOPPED: 'text-red-500 bg-red-500/10',
  ERROR: 'text-red-500 bg-red-500/10',
  STARTING: 'text-yellow-500 bg-yellow-500/10',
  STOPPING: 'text-yellow-500 bg-yellow-500/10',
  RESTARTING: 'text-yellow-500 bg-yellow-500/10',
  INSTALLING: 'text-blue-500 bg-blue-500/10',
  UPDATING: 'text-blue-500 bg-blue-500/10',
  INSTALLED: 'text-green-500 bg-green-500/10',
  NOT_INSTALLED: 'text-gray-500 bg-gray-500/10',
};

export const statusLabels: Record<string, string> = {
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  ERROR: 'Error',
  STARTING: 'Starting',
  STOPPING: 'Stopping',
  RESTARTING: 'Restarting',
  INSTALLING: 'Installing',
  UPDATING: 'Updating',
  INSTALLED: 'Installed',
  NOT_INSTALLED: 'Not Installed',
};
