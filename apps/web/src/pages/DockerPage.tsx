import React, { useEffect, useState } from 'react';
import { dockerApi, DockerContainer, DockerImage, DockerVolume, DockerNetwork } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Box,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Database,
  Globe,
  HardDrive,
  Terminal,
} from 'lucide-react';

export function DockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<string[]>([]);

  useEffect(() => {
    checkDocker();
  }, []);

  const checkDocker = async () => {
    try {
      const response = await dockerApi.check();
      if (response.data.available) {
        await fetchData();
      } else {
        setDockerAvailable(false);
        setLoading(false);
      }
    } catch {
      setDockerAvailable(false);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [containersRes, imagesRes, volumesRes, networksRes] = await Promise.all([
        dockerApi.listContainers(),
        dockerApi.listImages(),
        dockerApi.listVolumes(),
        dockerApi.listNetworks(),
      ]);
      setContainers(containersRes.data);
      setImages(imagesRes.data);
      setVolumes(volumesRes.data);
      setNetworks(networksRes.data);
    } catch (err) {
      console.error('Failed to fetch Docker data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'remove') => {
    try {
      switch (action) {
        case 'start':
          await dockerApi.startContainer(id);
          break;
        case 'stop':
          await dockerApi.stopContainer(id);
          break;
        case 'restart':
          await dockerApi.restartContainer(id);
          break;
        case 'remove':
          if (confirm('Are you sure you want to remove this container?')) {
            await dockerApi.removeContainer(id);
          }
          break;
      }
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} container:`, err);
    }
  };

  const handleViewLogs = async (id: string) => {
    setSelectedContainer(id);
    try {
      const response = await dockerApi.getContainerLogs(id, 100);
      setContainerLogs(response.data);
    } catch (err) {
      console.error('Failed to get logs:', err);
    }
  };

  const handleRemoveImage = async (id: string) => {
    if (confirm('Are you sure you want to remove this image?')) {
      try {
        await dockerApi.removeImage(id);
        await fetchData();
      } catch (err) {
        console.error('Failed to remove image:', err);
      }
    }
  };

  const handleRemoveVolume = async (name: string) => {
    if (confirm('Are you sure you want to remove this volume?')) {
      try {
        await dockerApi.removeVolume(name);
        await fetchData();
      } catch (err) {
        console.error('Failed to remove volume:', err);
      }
    }
  };

  const handlePrune = async () => {
    if (confirm('Are you sure you want to prune unused Docker resources?')) {
      try {
        await dockerApi.prune();
        await fetchData();
      } catch (err) {
        console.error('Failed to prune:', err);
      }
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'text-green-500 bg-green-500/10';
      case 'exited':
        return 'text-red-500 bg-red-500/10';
      case 'paused':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dockerAvailable) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Docker Management</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Docker Not Available</h2>
            <p className="text-muted-foreground">
              Docker is not installed or not running on this system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Docker Management</h1>
          <p className="text-muted-foreground">Manage containers, images, volumes, and networks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrune}>
            Prune
          </Button>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Containers</p>
                <p className="text-3xl font-bold">{containers.length}</p>
              </div>
              <Box className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Images</p>
                <p className="text-3xl font-bold">{images.length}</p>
              </div>
              <HardDrive className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volumes</p>
                <p className="text-3xl font-bold">{volumes.length}</p>
              </div>
              <Database className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Networks</p>
                <p className="text-3xl font-bold">{networks.length}</p>
              </div>
              <Globe className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="containers">
        <TabsList>
          <TabsTrigger value="containers">Containers</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          <Card>
            <CardHeader>
              <CardTitle>Containers</CardTitle>
            </CardHeader>
            <CardContent>
              {containers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No containers found</div>
              ) : (
                <div className="space-y-3">
                  {containers.map((container) => (
                    <div key={container.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <Badge className={getStateColor(container.state)}>
                          {container.state}
                        </Badge>
                        <div>
                          <div className="font-medium">{container.name}</div>
                          <div className="text-sm text-muted-foreground">{container.image}</div>
                          <div className="text-xs text-muted-foreground">{container.ports}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {container.state === 'running' ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleContainerAction(container.id, 'stop')}>
                              <Square className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleContainerAction(container.id, 'restart')}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleContainerAction(container.id, 'start')}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleViewLogs(container.id)}>
                          <Terminal className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleContainerAction(container.id, 'remove')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No images found</div>
              ) : (
                <div className="space-y-3">
                  {images.map((image) => (
                    <div key={image.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <div className="font-medium">{image.repository}:{image.tag}</div>
                        <div className="text-sm text-muted-foreground">{image.size}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveImage(image.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volumes">
          <Card>
            <CardHeader>
              <CardTitle>Volumes</CardTitle>
            </CardHeader>
            <CardContent>
              {volumes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No volumes found</div>
              ) : (
                <div className="space-y-3">
                  {volumes.map((volume) => (
                    <div key={volume.name} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <div className="font-medium">{volume.name}</div>
                        <div className="text-sm text-muted-foreground">{volume.driver}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveVolume(volume.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networks">
          <Card>
            <CardHeader>
              <CardTitle>Networks</CardTitle>
            </CardHeader>
            <CardContent>
              {networks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No networks found</div>
              ) : (
                <div className="space-y-3">
                  {networks.map((network) => (
                    <div key={network.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <div className="font-medium">{network.name}</div>
                        <div className="text-sm text-muted-foreground">{network.driver} • {network.scope}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logs Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Container Logs</CardTitle>
              <Button variant="ghost" onClick={() => { setSelectedContainer(null); setContainerLogs([]); }}>
                ×
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <pre className="text-sm font-mono bg-secondary p-4 rounded-lg overflow-auto max-h-[60vh]">
                {containerLogs.join('\n') || 'No logs available'}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
