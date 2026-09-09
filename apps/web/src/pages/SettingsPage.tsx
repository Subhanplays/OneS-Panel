import React, { useEffect, useState } from 'react';
import { settingsApi, brandingApi, Branding } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useBranding } from '@/contexts/BrandingContext';
import { Save, Palette, Shield, Bell, Database, Settings as SettingsIcon, Bot, Activity, Box } from 'lucide-react';

export function SettingsPage() {
  const { branding, updateBranding } = useBranding();
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Branding state
  const [brandingForm, setBrandingForm] = useState({
    panelName: branding?.panelName || 'ONES PANEL',
    companyName: branding?.companyName || '',
    primaryColor: branding?.primaryColor || '#3b82f6',
    secondaryColor: branding?.secondaryColor || '#1e40af',
    accentColor: branding?.accentColor || '#60a5fa',
    backgroundColor: branding?.backgroundColor || '#0f172a',
    browserTitle: branding?.browserTitle || 'ONES PANEL',
    footerText: branding?.footerText || '',
  });

  // VPS Deploy Bot state
  const [vpsDeployForm, setVpsDeployForm] = useState({
    token: '',
    guildId: '',
    adminIds: '',
    adminRoleId: '',
    maxVpsPerUser: '3',
    defaultOsImage: 'ubuntu:22.04',
    dockerNetwork: 'bridge',
    maxContainers: '100',
    watermark: 'VPS Service',
    welcomeMessage: 'Welcome! Get Started With Us!',
    hostnamePrefix: 'vps',
    dockerImagePrefix: 'panel',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        panelName: branding.panelName,
        companyName: branding.companyName,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        backgroundColor: branding.backgroundColor,
        browserTitle: branding.browserTitle,
        footerText: branding.footerText,
      });
    }
  }, [branding]);

  useEffect(() => {
    if (settings.vps_deploy) {
      setVpsDeployForm({
        token: settings.vps_deploy.token || '',
        guildId: settings.vps_deploy.guildId || '',
        adminIds: settings.vps_deploy.adminIds || '',
        adminRoleId: settings.vps_deploy.adminRoleId || '',
        maxVpsPerUser: settings.vps_deploy.maxVpsPerUser || '3',
        defaultOsImage: settings.vps_deploy.defaultOsImage || 'ubuntu:22.04',
        dockerNetwork: settings.vps_deploy.dockerNetwork || 'bridge',
        maxContainers: settings.vps_deploy.maxContainers || '100',
        watermark: settings.vps_deploy.watermark || 'VPS Service',
        welcomeMessage: settings.vps_deploy.welcomeMessage || 'Welcome! Get Started With Us!',
        hostnamePrefix: settings.vps_deploy.hostnamePrefix || 'vps',
        dockerImagePrefix: settings.vps_deploy.dockerImagePrefix || 'panel',
      });
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.list();
      setSettings(response.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await updateBranding(brandingForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await settingsApi.update(key, value);
      await fetchSettings();
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleSaveVpsDeploy = async () => {
    setSaving(true);
    try {
      await settingsApi.bulkUpdate(
        Object.entries(vpsDeployForm).map(([key, value]) => ({
          key: `vps_deploy.${key}`,
          value,
        }))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save VPS deploy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your panel settings</p>
        </div>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="discord">
            <Bot className="h-4 w-4 mr-2" />
            Discord
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Box className="h-4 w-4 mr-2" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="vps-deploy">
            <Bot className="h-4 w-4 mr-2" />
            VPS Deploy Bot
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Panel Branding</CardTitle>
              <CardDescription>Customize the look and feel of your panel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Panel Name</label>
                  <Input
                    value={brandingForm.panelName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, panelName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={brandingForm.companyName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Browser Title</label>
                  <Input
                    value={brandingForm.browserTitle}
                    onChange={(e) => setBrandingForm({ ...brandingForm, browserTitle: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Footer Text</label>
                  <Input
                    value={brandingForm.footerText}
                    onChange={(e) => setBrandingForm({ ...brandingForm, footerText: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Colors</label>
                <div className="grid gap-4 md:grid-cols-3 mt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Primary Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Secondary Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={brandingForm.secondaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandingForm.secondaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Accent Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Background Color</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={brandingForm.backgroundColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={brandingForm.backgroundColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, backgroundColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : saved ? (
                    <>Saved!</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Branding
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="p-6 rounded-lg border"
                style={{ backgroundColor: brandingForm.backgroundColor }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: brandingForm.primaryColor }}
                  >
                    <span className="text-white font-bold">OP</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">
                      {brandingForm.panelName}
                    </div>
                    <div className="text-sm text-gray-400">
                      {brandingForm.companyName}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general panel settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Monitoring Interval</div>
                  <div className="text-sm text-muted-foreground">How often to collect metrics (seconds)</div>
                </div>
                <Input
                  type="number"
                  value={settings.monitoring?.interval || '30'}
                  onChange={(e) => handleSaveSetting('monitoring.interval', e.target.value)}
                  className="w-24"
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Backup Retention</div>
                  <div className="text-sm text-muted-foreground">Days to keep backups</div>
                </div>
                <Input
                  type="number"
                  value={settings.backups?.retention_days || '30'}
                  onChange={(e) => handleSaveSetting('backups.retention_days', e.target.value)}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">Require 2FA for all users</div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Session Timeout</div>
                  <div className="text-sm text-muted-foreground">Auto logout after inactivity</div>
                </div>
                <Badge variant="outline">7 days</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">API Rate Limiting</div>
                  <div className="text-sm text-muted-foreground">Requests per minute</div>
                </div>
                <Badge variant="outline">100</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Panel Notifications</div>
                  <div className="text-sm text-muted-foreground">Show notifications in the panel</div>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Discord Webhooks</div>
                  <div className="text-sm text-muted-foreground">Send alerts to Discord</div>
                </div>
                <Badge variant="outline">Configure</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Send alerts via email</div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Information</CardTitle>
              <CardDescription>View database status and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Database Type</div>
                  <div className="text-sm text-muted-foreground">PostgreSQL</div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Redis</div>
                  <div className="text-sm text-muted-foreground">Queue and caching</div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vps-deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VPS Deploy Bot Configuration</CardTitle>
              <CardDescription>Configure the VPS deployment bot with white-label settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Discord Bot Token</label>
                  <Input
                    type="password"
                    value={vpsDeployForm.token}
                    onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, token: e.target.value })}
                    className="mt-1"
                    placeholder="Enter bot token"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Guild ID</label>
                  <Input
                    value={vpsDeployForm.guildId}
                    onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, guildId: e.target.value })}
                    className="mt-1"
                    placeholder="Enter guild ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Admin User IDs</label>
                  <Input
                    value={vpsDeployForm.adminIds}
                    onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, adminIds: e.target.value })}
                    className="mt-1"
                    placeholder="Comma-separated user IDs"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Role ID</label>
                  <Input
                    value={vpsDeployForm.adminRoleId}
                    onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, adminRoleId: e.target.value })}
                    className="mt-1"
                    placeholder="Enter role ID"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">White-Label Settings</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Watermark / Brand Name</label>
                    <Input
                      value={vpsDeployForm.watermark}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, watermark: e.target.value })}
                      className="mt-1"
                      placeholder="Your brand name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Welcome Message</label>
                    <Input
                      value={vpsDeployForm.welcomeMessage}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, welcomeMessage: e.target.value })}
                      className="mt-1"
                      placeholder="Welcome message for users"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hostname Prefix</label>
                    <Input
                      value={vpsDeployForm.hostnamePrefix}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, hostnamePrefix: e.target.value })}
                      className="mt-1"
                      placeholder="vps"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Docker Image Prefix</label>
                    <Input
                      value={vpsDeployForm.dockerImagePrefix}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, dockerImagePrefix: e.target.value })}
                      className="mt-1"
                      placeholder="panel"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">VPS Limits</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Max VPS Per User</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={vpsDeployForm.maxVpsPerUser}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, maxVpsPerUser: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Containers</label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={vpsDeployForm.maxContainers}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, maxContainers: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default OS Image</label>
                    <Input
                      value={vpsDeployForm.defaultOsImage}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, defaultOsImage: e.target.value })}
                      className="mt-1"
                      placeholder="ubuntu:22.04"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Docker Network</label>
                    <Input
                      value={vpsDeployForm.dockerNetwork}
                      onChange={(e) => setVpsDeployForm({ ...vpsDeployForm, dockerNetwork: e.target.value })}
                      className="mt-1"
                      placeholder="bridge"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveVpsDeploy} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : saved ? (
                    <>Saved!</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save VPS Deploy Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discord Tab */}
        <TabsContent value="discord" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discord Configuration</CardTitle>
              <CardDescription>Configure Discord bot integration settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Discord Webhook URL</label>
                  <Input
                    value={settings.discord?.webhook_url || ''}
                    onChange={(e) => handleSaveSetting('discord.webhook_url', e.target.value)}
                    className="mt-1"
                    placeholder="https://discord.com/api/webhooks/..."
                    type="password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alert Webhook URL</label>
                  <Input
                    value={settings.discord?.alert_webhook_url || ''}
                    onChange={(e) => handleSaveSetting('discord.alert_webhook_url', e.target.value)}
                    className="mt-1"
                    placeholder="https://discord.com/api/webhooks/..."
                    type="password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Guild ID</label>
                  <Input
                    value={settings.discord?.default_guild_id || ''}
                    onChange={(e) => handleSaveSetting('discord.default_guild_id', e.target.value)}
                    className="mt-1"
                    placeholder="Enter guild ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status Channel ID</label>
                  <Input
                    value={settings.discord?.status_channel_id || ''}
                    onChange={(e) => handleSaveSetting('discord.status_channel_id', e.target.value)}
                    className="mt-1"
                    placeholder="Enter channel ID"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Notifications</h3>
                <div className="space-y-2">
                  {[
                    { key: 'discord.notify_alerts', label: 'Send alerts to Discord' },
                    { key: 'discord.notify_status_changes', label: 'Notify status changes' },
                    { key: 'discord.notify_deployments', label: 'Notify VPS deployments' },
                    { key: 'discord.notify_backups', label: 'Notify backup results' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.discord?.[item.key.replace('discord.', '')] === 'true'}
                        onChange={(e) => handleSaveSetting(item.key, e.target.checked ? 'true' : 'false')}
                        className="rounded"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Configure application management settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Default Install Directory</label>
                  <Input
                    value={settings.applications?.install_dir || '/opt/ones-panel/services'}
                    onChange={(e) => handleSaveSetting('applications.install_dir', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Auto-update Applications</label>
                  <select
                    value={settings.applications?.auto_update || 'false'}
                    onChange={(e) => handleSaveSetting('applications.auto_update', e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Max Concurrent Installs</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.applications?.max_concurrent || '3'}
                    onChange={(e) => handleSaveSetting('applications.max_concurrent', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Process Manager</label>
                  <select
                    value={settings.applications?.process_manager || 'pm2'}
                    onChange={(e) => handleSaveSetting('applications.process_manager', e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="pm2">PM2</option>
                    <option value="systemd">Systemd</option>
                    <option value="docker">Docker</option>
                  </select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Logs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Log Retention (days)</label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.applications?.log_retention || '30'}
                      onChange={(e) => handleSaveSetting('applications.log_retention', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Log Size (MB)</label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={settings.applications?.max_log_size || '100'}
                      onChange={(e) => handleSaveSetting('applications.max_log_size', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Settings</CardTitle>
              <CardDescription>Configure monitoring and metrics collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Metrics Collection Interval (seconds)</label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={settings.monitoring?.interval || '30'}
                    onChange={(e) => handleSaveSetting('monitoring.interval', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Metrics Retention (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.monitoring?.retention || '30'}
                    onChange={(e) => handleSaveSetting('monitoring.retention', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Health Check Interval (seconds)</label>
                  <Input
                    type="number"
                    min={30}
                    max={600}
                    value={settings.monitoring?.health_check_interval || '60'}
                    onChange={(e) => handleSaveSetting('monitoring.health_check_interval', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alert Evaluation Interval (seconds)</label>
                  <Input
                    type="number"
                    min={30}
                    max={600}
                    value={settings.monitoring?.alert_interval || '120'}
                    onChange={(e) => handleSaveSetting('monitoring.alert_interval', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Alert Thresholds</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">CPU Alert Threshold (%)</label>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.monitoring?.cpu_threshold || '80'}
                      onChange={(e) => handleSaveSetting('monitoring.cpu_threshold', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">RAM Alert Threshold (%)</label>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.monitoring?.ram_threshold || '85'}
                      onChange={(e) => handleSaveSetting('monitoring.ram_threshold', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Disk Alert Threshold (%)</label>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.monitoring?.disk_threshold || '90'}
                      onChange={(e) => handleSaveSetting('monitoring.disk_threshold', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced panel settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.advanced?.session_timeout || '60'}
                    onChange={(e) => handleSaveSetting('advanced.session_timeout', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Rate Limit (requests/minute)</label>
                  <Input
                    type="number"
                    min={10}
                    max={1000}
                    value={settings.advanced?.rate_limit || '100'}
                    onChange={(e) => handleSaveSetting('advanced.rate_limit', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Terminal Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={settings.advanced?.terminal_timeout || '15'}
                    onChange={(e) => handleSaveSetting('advanced.terminal_timeout', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Upload Size (MB)</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.advanced?.max_upload_size || '10'}
                    onChange={(e) => handleSaveSetting('advanced.max_upload_size', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Security</h3>
                <div className="space-y-2">
                  {[
                    { key: 'advanced.require_2fa', label: 'Require 2FA for admin accounts' },
                    { key: 'advanced.audit_logging', label: 'Enable audit logging' },
                    { key: 'advanced.encrypt_secrets', label: 'Encrypt sensitive settings' },
                    { key: 'advanced.secure_cookies', label: 'Use secure cookies' },
                    { key: 'advanced.csrf_protection', label: 'Enable CSRF protection' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.advanced?.[item.key.replace('advanced.', '')] === 'true'}
                        onChange={(e) => handleSaveSetting(item.key, e.target.checked ? 'true' : 'false')}
                        className="rounded"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Maintenance</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Clear Cache</Button>
                  <Button variant="outline" size="sm">Restart Worker</Button>
                  <Button variant="destructive" size="sm">Reset All Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
