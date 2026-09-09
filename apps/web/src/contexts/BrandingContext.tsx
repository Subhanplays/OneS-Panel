import React, { createContext, useContext, useState, useEffect } from 'react';
import { brandingApi, Branding } from '@/lib/api';

interface BrandingContextType {
  branding: Branding | null;
  loading: boolean;
  updateBranding: (data: Partial<Branding>) => Promise<void>;
}

const defaultBranding: Branding = {
  id: 'default',
  panelName: 'ONES PANEL',
  companyName: 'Ones Panel',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#60a5fa',
  backgroundColor: '#0f172a',
  backgroundImageUrl: null,
  loginBackgroundUrl: null,
  browserTitle: 'ONES PANEL',
  footerText: 'Powered by Ones Panel',
  supportUrl: null,
  discordUrl: null,
  websiteUrl: null,
  docsUrl: null,
  socialLinks: {},
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await brandingApi.get();
      setBranding(response.data);
      applyBranding(response.data);
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyBranding = (data: Branding) => {
    document.title = data.browserTitle || data.panelName;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', data.primaryColor);
    root.style.setProperty('--secondary-color', data.secondaryColor);
    root.style.setProperty('--accent-color', data.accentColor);
    root.style.setProperty('--background-color', data.backgroundColor);
  };

  const updateBranding = async (newData: Partial<Branding>) => {
    const response = await brandingApi.update(newData);
    setBranding(response.data);
    applyBranding(response.data);
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
