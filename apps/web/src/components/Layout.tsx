import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import {
  LayoutDashboard,
  Server,
  Box,
  Activity,
  Settings,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bot,
  HardDrive,
  Globe,
  BarChart3,
  AlertTriangle,
  Terminal,
  Database,
  Shield,
  Store,
  Heart,
  Archive,
  Gamepad2,
  Hammer,
  Send,
  Palette,
  Key,
  MessageSquare,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Overview', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { label: 'VPS', path: '/vps', icon: Server },
      { label: 'Minecraft', path: '/minecraft', icon: Gamepad2 },
      { label: 'JTG Panel', path: '/jtg', icon: Hammer },
      { label: 'Applications', path: '/applications', icon: Box },
      { label: 'Marketplace', path: '/marketplace', icon: Store },
      { label: 'Services', path: '/services', icon: HardDrive },
      { label: 'Docker', path: '/docker', icon: Database },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      { label: 'Performance', path: '/performance', icon: Activity },
      { label: 'Status', path: '/status', icon: Globe },
      { label: 'Alerts', path: '/alerts', icon: AlertTriangle },
      { label: 'Logs', path: '/logs', icon: FileText },
    ],
  },
  {
    label: 'Bots',
    items: [
      { label: 'VPS Deploy Bot', path: '/bots/vps-deploy', icon: Bot },
      { label: 'Hosting Ops Bot', path: '/bots/hosting-ops', icon: Bot },
      { label: 'Campaigns', path: '/campaigns', icon: Send },
      { label: 'Broadcasts', path: '/broadcasts', icon: MessageSquare },
      { label: 'Embed Builder', path: '/embed-builder', icon: Palette },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Terminal', path: '/terminal', icon: Terminal },
      { label: 'Health Checks', path: '/healthchecks', icon: Heart },
      { label: 'Backups', path: '/backups', icon: Archive },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Roles', path: '/roles', icon: Shield },
      { label: 'Audit Logs', path: '/audit', icon: FileText },
      { label: 'API & Integrations', path: '/api-integrations', icon: Key },
      { label: 'Branding', path: '/branding', icon: Palette },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="ml-4 font-semibold">{branding?.panelName || 'ONES PANEL'}</div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full border-r bg-background z-40 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-14 flex items-center border-b px-4">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">OP</span>
                </div>
                <span className="font-semibold">{branding?.panelName || 'ONES PANEL'}</span>
              </div>
            )}
            {collapsed && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                <span className="text-primary-foreground font-bold text-sm">OP</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            {navigation.map((group) => (
              <div key={group.label} className="mb-4">
                {!collapsed && (
                  <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          collapsed && 'justify-center px-2'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span>{item.label}</span>
                            {item.badge && (
                              <Badge variant="destructive" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t p-2">
            {!collapsed && (
              <div className="px-3 py-2">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={logout}
                className={cn(collapsed && 'w-full')}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Logout</span>}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'transition-all duration-300',
          collapsed ? 'lg:ml-16' : 'lg:ml-64',
          'pt-14 lg:pt-0'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
