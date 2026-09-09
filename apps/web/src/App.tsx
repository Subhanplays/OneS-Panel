import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { AlertsPage } from '@/pages/AlertsPage';
import { HealthChecksPage } from '@/pages/HealthChecksPage';
import { DockerPage } from '@/pages/DockerPage';
import { StatusPage } from '@/pages/StatusPageViewer';
import { UsersPage } from '@/pages/UsersPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BackupsPage } from '@/pages/BackupsPage';
import { VPSPage } from '@/pages/VPSPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { LogsPage } from '@/pages/LogsPage';
import { VPSDeployBotPage } from '@/pages/VPSDeployBotPage';
import { HostingOpsBotPage } from '@/pages/HostingOpsBotPage';
import { TerminalPage } from '@/pages/TerminalPage';
import { MinecraftPage } from '@/pages/MinecraftPage';
import { JTGPage } from '@/pages/JTGPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { BroadcastsPage } from '@/pages/BroadcastsPage';
import { EmbedBuilderPage } from '@/pages/EmbedBuilderPage';
import { RolesPage } from '@/pages/RolesPage';
import { BrandingPage } from '@/pages/BrandingPage';
import { APIIntegrationsPage } from '@/pages/APIIntegrationsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/setup" element={<PublicRoute><SetupPage /></PublicRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="vps" element={<VPSPage />} />
        <Route path="minecraft" element={<MinecraftPage />} />
        <Route path="jtg" element={<JTGPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="docker" element={<DockerPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="healthchecks" element={<HealthChecksPage />} />
        <Route path="bots/vps-deploy" element={<VPSDeployBotPage />} />
        <Route path="bots/hosting-ops" element={<HostingOpsBotPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="broadcasts" element={<BroadcastsPage />} />
        <Route path="embed-builder" element={<EmbedBuilderPage />} />
        <Route path="terminal" element={<TerminalPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="api-integrations" element={<APIIntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <AppRoutes />
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
