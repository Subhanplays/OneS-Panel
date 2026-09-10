import React, { useEffect, useState } from 'react';
import { applicationsApi, Application } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Box,
  Download,
  Settings,
  Check,
  Gamepad2,
  BarChart3,
  Bot,
  Search,
} from 'lucide-react';

interface MarketplaceItem {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  installed: boolean;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Minecraft: Gamepad2,
  Monitoring: BarChart3,
  Discord: Bot,
};

export function MarketplacePage() {
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [marketplaceRes, appsRes] = await Promise.all([
        applicationsApi.getMarketplace(),
        applicationsApi.list(),
      ]);
      setMarketplace(marketplaceRes.data || []);
      setApplications(appsRes.data);
    } catch (err) {
      console.error('Failed to fetch marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (type: string) => {
    const app = applications.find(a => a.type === type);
    if (!app) return;

    setInstalling(type);
    try {
      await applicationsApi.install(app.id);
      await fetchData();
    } catch (err) {
      console.error('Failed to install:', err);
    } finally {
      setInstalling(null);
    }
  };

  const getApplication = (type: string) => {
    return applications.find(a => a.type === type);
  };

  const filteredMarketplace = marketplace.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(marketplace.map(item => item.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Application Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Install and manage applications for your hosting infrastructure
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Marketplace Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMarketplace.map((item) => {
          const app = getApplication(item.type);
          const isInstalled = item.installed;
          const isInstallingThis = installing === item.type;
          const CategoryIcon = categoryIcons[item.category] || Box;

          return (
            <Card key={item.type} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  {isInstalled && (
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      Installed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                
                {isInstalled && app && (
                  <div className="mb-4">
                    <Badge className={app.status === 'RUNNING' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                      {app.status}
                    </Badge>
                  </div>
                )}

                <div className="flex gap-2">
                  {!isInstalled ? (
                    <Button
                      onClick={() => handleInstall(item.type)}
                      disabled={isInstallingThis}
                      className="flex-1"
                    >
                      {isInstallingThis ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMarketplace.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No applications found</p>
        </div>
      )}
    </div>
  );
}
