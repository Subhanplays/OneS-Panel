import React, { useEffect, useState, useRef } from 'react';
import { brandingApi, Branding } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useBranding } from '@/contexts/BrandingContext';
import {
  Palette,
  Save,
  Upload,
  Trash2,
  Eye,
  Globe,
  Link,
  Image,
  Type,
  Mail,
} from 'lucide-react';

export function BrandingPage() {
  const { branding: ctxBranding, updateBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    panelName: '',
    companyName: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#60a5fa',
    backgroundColor: '#0f172a',
    browserTitle: '',
    footerText: '',
    discordUrl: '',
    websiteUrl: '',
    docsUrl: '',
    supportUrl: '',
    twitterUrl: '',
    githubUrl: '',
    youtubeUrl: '',
    socialLinks: '{}' as string,
    emailHeaderColor: '#3b82f6',
    emailFooterText: '',
  });

  const [images, setImages] = useState({
    logo: null as string | null,
    favicon: null as string | null,
    loginLogo: null as string | null,
    dashboardLogo: null as string | null,
    backgroundImage: null as string | null,
    loginBackground: null as string | null,
    loadingScreen: null as string | null,
  });

  const fileRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    logo: useRef<HTMLInputElement>(null),
    favicon: useRef<HTMLInputElement>(null),
    loginLogo: useRef<HTMLInputElement>(null),
    dashboardLogo: useRef<HTMLInputElement>(null),
    backgroundImage: useRef<HTMLInputElement>(null),
    loginBackground: useRef<HTMLInputElement>(null),
    loadingScreen: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    if (ctxBranding) {
      setForm({
        panelName: ctxBranding.panelName || '',
        companyName: ctxBranding.companyName || '',
        primaryColor: ctxBranding.primaryColor || '#3b82f6',
        secondaryColor: ctxBranding.secondaryColor || '#1e40af',
        accentColor: ctxBranding.accentColor || '#60a5fa',
        backgroundColor: ctxBranding.backgroundColor || '#0f172a',
        browserTitle: ctxBranding.browserTitle || '',
        footerText: ctxBranding.footerText || '',
        discordUrl: ctxBranding.discordUrl || '',
        websiteUrl: ctxBranding.websiteUrl || '',
        docsUrl: ctxBranding.docsUrl || '',
        supportUrl: ctxBranding.supportUrl || '',
        twitterUrl: '',
        githubUrl: '',
        youtubeUrl: '',
        socialLinks: ctxBranding.socialLinks ? JSON.stringify(ctxBranding.socialLinks, null, 2) : '{}',
        emailHeaderColor: '#3b82f6',
        emailFooterText: '',
      });
      setImages({
        logo: ctxBranding.logoUrl || null,
        favicon: ctxBranding.faviconUrl || null,
        loginLogo: null,
        dashboardLogo: null,
        backgroundImage: ctxBranding.backgroundImageUrl || null,
        loginBackground: ctxBranding.loginBackgroundUrl || null,
        loadingScreen: null,
      });
    }
    setLoading(false);
  }, [ctxBranding]);

  const handleImageUpload = (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImages((prev) => ({ ...prev, [key]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = (key: string) => {
    setImages((prev) => ({ ...prev, [key]: null }));
    if (fileRefs[key].current) {
      fileRefs[key].current!.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let socialLinks = {};
      try {
        socialLinks = JSON.parse(form.socialLinks);
      } catch {
        socialLinks = {};
      }

      const data: Partial<Branding> = {
        panelName: form.panelName,
        companyName: form.companyName,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        backgroundColor: form.backgroundColor,
        browserTitle: form.browserTitle,
        footerText: form.footerText,
        discordUrl: form.discordUrl || null,
        websiteUrl: form.websiteUrl || null,
        docsUrl: form.docsUrl || null,
        supportUrl: form.supportUrl || null,
        socialLinks,
      };
      await updateBranding(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setSaving(false);
    }
  };

  const imageUploadSections: { key: string; label: string }[] = [
    { key: 'logo', label: 'Logo' },
    { key: 'favicon', label: 'Favicon' },
    { key: 'loginLogo', label: 'Login Logo' },
    { key: 'dashboardLogo', label: 'Dashboard Logo' },
    { key: 'backgroundImage', label: 'Background Image' },
    { key: 'loginBackground', label: 'Login Background' },
    { key: 'loadingScreen', label: 'Loading Screen' },
  ];

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
          <h1 className="text-3xl font-bold">Branding</h1>
          <p className="text-muted-foreground">White-label customization for your panel</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Images & Logos
              </CardTitle>
              <CardDescription>Upload and manage branding images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageUploadSections.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {images[key as keyof typeof images] ? (
                      <img
                        src={images[key as keyof typeof images]!}
                        alt={label}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {images[key as keyof typeof images] ? 'Image uploaded' : 'No image uploaded'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <input
                      ref={fileRefs[key]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(key, file);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileRefs[key].current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {images[key as keyof typeof images] ? 'Change' : 'Upload'}
                    </Button>
                    {images[key as keyof typeof images] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleImageRemove(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'primaryColor', label: 'Primary Color' },
                { key: 'secondaryColor', label: 'Secondary Color' },
                { key: 'accentColor', label: 'Accent Color' },
                { key: 'backgroundColor', label: 'Background Color' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium">{label}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Text Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Text & Labels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Panel Name</label>
                  <Input
                    value={form.panelName}
                    onChange={(e) => setForm({ ...form, panelName: e.target.value })}
                    className="mt-1"
                    placeholder="ONES PANEL"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="mt-1"
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Browser Title</label>
                  <Input
                    value={form.browserTitle}
                    onChange={(e) => setForm({ ...form, browserTitle: e.target.value })}
                    className="mt-1"
                    placeholder="ONES PANEL"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Footer Text</label>
                  <Input
                    value={form.footerText}
                    onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                    className="mt-1"
                    placeholder="© 2026 Your Company"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Discord URL</label>
                  <Input
                    value={form.discordUrl}
                    onChange={(e) => setForm({ ...form, discordUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://discord.gg/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Website URL</label>
                  <Input
                    value={form.websiteUrl}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Docs URL</label>
                  <Input
                    value={form.docsUrl}
                    onChange={(e) => setForm({ ...form, docsUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://docs..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Support URL</label>
                  <Input
                    value={form.supportUrl}
                    onChange={(e) => setForm({ ...form, supportUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://support..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Twitter URL</label>
                  <Input
                    value={form.twitterUrl}
                    onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">GitHub URL</label>
                  <Input
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">YouTube URL</label>
                  <Input
                    value={form.youtubeUrl}
                    onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Additional Social Links (JSON)</label>
                <textarea
                  value={form.socialLinks}
                  onChange={(e) => setForm({ ...form, socialLinks: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm font-mono min-h-[80px]"
                  placeholder='{"twitch": "https://twitch.tv/...", "linkedin": "https://linkedin.com/..."}'
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Header Color</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={form.emailHeaderColor}
                    onChange={(e) => setForm({ ...form, emailHeaderColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.emailHeaderColor}
                    onChange={(e) => setForm({ ...form, emailHeaderColor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email Footer Text</label>
                <Input
                  value={form.emailFooterText}
                  onChange={(e) => setForm({ ...form, emailFooterText: e.target.value })}
                  className="mt-1"
                  placeholder="This email was sent by..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Login Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Login Page</h4>
                <div
                  className="rounded-lg overflow-hidden border"
                  style={{ backgroundColor: form.backgroundColor }}
                >
                  <div className="p-6 flex flex-col items-center">
                    {images.loginLogo ? (
                      <img src={images.loginLogo} alt="" className="h-12 mb-4" />
                    ) : images.logo ? (
                      <img src={images.logo} alt="" className="h-12 mb-4" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                        style={{ backgroundColor: form.primaryColor }}
                      >
                        <span className="text-white font-bold">OP</span>
                      </div>
                    )}
                    <div className="text-lg font-bold text-white">{form.panelName}</div>
                    <div className="text-xs text-gray-400 mb-4">{form.companyName}</div>
                    <div className="w-full max-w-xs space-y-2">
                      <div className="h-8 rounded bg-gray-700/50" />
                      <div className="h-8 rounded bg-gray-700/50" />
                      <div
                        className="h-8 rounded flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: form.primaryColor }}
                      >
                        Sign In
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Dashboard Header</h4>
                <div className="rounded-lg border overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: form.backgroundColor }}
                  >
                    {images.dashboardLogo || images.logo ? (
                      <img
                        src={images.dashboardLogo || images.logo!}
                        alt=""
                        className="h-6"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: form.primaryColor }}
                      >
                        <span className="text-white text-xs font-bold">OP</span>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white">{form.panelName}</span>
                  </div>
                  <div className="h-32 bg-muted/30 p-4">
                    <div className="h-4 w-32 bg-muted rounded mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded border bg-card" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <h4 className="text-sm font-medium mb-2">Color Palette</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: form.primaryColor, label: 'Primary' },
                    { color: form.secondaryColor, label: 'Secondary' },
                    { color: form.accentColor, label: 'Accent' },
                    { color: form.backgroundColor, label: 'Background' },
                  ].map(({ color, label }) => (
                    <div key={label} className="text-center">
                      <div
                        className="h-10 rounded border mb-1"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Social Links</h4>
                <div className="flex flex-wrap gap-2">
                  {form.discordUrl && <Badge variant="outline">Discord</Badge>}
                  {form.websiteUrl && <Badge variant="outline">Website</Badge>}
                  {form.docsUrl && <Badge variant="outline">Docs</Badge>}
                  {form.supportUrl && <Badge variant="outline">Support</Badge>}
                  {form.twitterUrl && <Badge variant="outline">Twitter</Badge>}
                  {form.githubUrl && <Badge variant="outline">GitHub</Badge>}
                  {form.youtubeUrl && <Badge variant="outline">YouTube</Badge>}
                </div>
              </div>

              {/* Email Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Email Template</h4>
                <div className="rounded-lg border overflow-hidden">
                  <div
                    className="px-4 py-3 text-white text-xs font-semibold"
                    style={{ backgroundColor: form.emailHeaderColor }}
                  >
                    {form.panelName}
                  </div>
                  <div className="p-4 bg-white">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                  {form.emailFooterText && (
                    <div className="px-4 py-2 bg-gray-50 border-t text-center">
                      <span className="text-xs text-gray-500">{form.emailFooterText}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
