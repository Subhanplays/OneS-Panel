import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Lock,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

const PERMISSION_CATEGORIES: Record<string, { permission: string; description: string }[]> = {
  VPS: [
    { permission: 'vps.create', description: 'Create new VPS instances' },
    { permission: 'vps.view', description: 'View VPS instances' },
    { permission: 'vps.start', description: 'Start VPS instances' },
    { permission: 'vps.stop', description: 'Stop VPS instances' },
    { permission: 'vps.restart', description: 'Restart VPS instances' },
    { permission: 'vps.delete', description: 'Delete VPS instances' },
    { permission: 'vps.suspend', description: 'Suspend VPS instances' },
    { permission: 'vps.transfer', description: 'Transfer VPS ownership' },
  ],
  Applications: [
    { permission: 'applications.view', description: 'View applications' },
    { permission: 'applications.install', description: 'Install applications' },
    { permission: 'applications.start', description: 'Start applications' },
    { permission: 'applications.stop', description: 'Stop applications' },
    { permission: 'applications.restart', description: 'Restart applications' },
    { permission: 'applications.uninstall', description: 'Uninstall applications' },
    { permission: 'applications.configure', description: 'Configure applications' },
  ],
  Minecraft: [
    { permission: 'minecraft.view', description: 'View Minecraft servers' },
    { permission: 'minecraft.create', description: 'Create Minecraft servers' },
    { permission: 'minecraft.manage', description: 'Manage Minecraft servers' },
    { permission: 'minecraft.players', description: 'Manage players' },
    { permission: 'minecraft.plugins', description: 'Manage plugins/mods' },
  ],
  Bots: [
    { permission: 'bots.view', description: 'View Discord bots' },
    { permission: 'bots.create', description: 'Create Discord bots' },
    { permission: 'bots.manage', description: 'Manage Discord bots' },
    { permission: 'bots.delete', description: 'Delete Discord bots' },
  ],
  Logs: [
    { permission: 'logs.view', description: 'View system logs' },
    { permission: 'logs.export', description: 'Export logs' },
    { permission: 'logs.delete', description: 'Delete logs' },
  ],
  Terminal: [
    { permission: 'terminal.access', description: 'Access web terminal' },
    { permission: 'terminal.execute', description: 'Execute commands' },
  ],
  Settings: [
    { permission: 'settings.view', description: 'View settings' },
    { permission: 'settings.edit', description: 'Edit settings' },
    { permission: 'settings.branding', description: 'Edit branding' },
  ],
  Users: [
    { permission: 'users.view', description: 'View users' },
    { permission: 'users.create', description: 'Create users' },
    { permission: 'users.edit', description: 'Edit users' },
    { permission: 'users.delete', description: 'Delete users' },
    { permission: 'users.assign_roles', description: 'Assign roles' },
  ],
  Backups: [
    { permission: 'backups.view', description: 'View backups' },
    { permission: 'backups.create', description: 'Create backups' },
    { permission: 'backups.restore', description: 'Restore backups' },
    { permission: 'backups.delete', description: 'Delete backups' },
  ],
  Alerts: [
    { permission: 'alerts.view', description: 'View alerts' },
    { permission: 'alerts.create', description: 'Create alert rules' },
    { permission: 'alerts.acknowledge', description: 'Acknowledge alerts' },
    { permission: 'alerts.delete', description: 'Delete alerts' },
  ],
  Branding: [
    { permission: 'branding.view', description: 'View branding settings' },
    { permission: 'branding.edit', description: 'Edit branding' },
    { permission: 'branding.upload', description: 'Upload images' },
  ],
  Dashboard: [
    { permission: 'dashboard.view', description: 'View dashboard' },
    { permission: 'dashboard.analytics', description: 'View analytics' },
    { permission: 'dashboard.export', description: 'Export dashboard data' },
  ],
};

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      await fetchRoles();
    } catch (err) {
      console.error('Failed to delete role:', err);
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
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground">Manage roles and permission assignments</p>
        </div>
        <Button onClick={() => { setEditingRole(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
                <p className="text-3xl font-bold">{roles.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
                <p className="text-3xl font-bold">
                  {Object.values(PERMISSION_CATEGORIES).flat().length}
                </p>
              </div>
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Permission Categories</p>
                <p className="text-3xl font-bold">{Object.keys(PERMISSION_CATEGORIES).length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Create and manage custom roles with specific permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom roles configured. Create your first role above.
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.permissions.slice(0, 5).map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{role.permissions.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingRole(role); setShowModal(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Overview of all available permissions by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
              <div key={category} className="border rounded-lg">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category}</span>
                    <Badge variant="secondary" className="text-xs">{permissions.length}</Badge>
                  </div>
                  <X
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedCategory === category ? 'rotate-45' : ''
                    }`}
                  />
                </button>
                {expandedCategory === category && (
                  <div className="px-3 pb-3 space-y-2">
                    {permissions.map((perm) => (
                      <div key={perm.permission} className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/50">
                        <div>
                          <span className="text-sm font-mono">{perm.permission}</span>
                          <span className="text-xs text-muted-foreground ml-2">{perm.description}</span>
                        </div>
                        <div className="flex gap-1">
                          {roles.map((role) => (
                            <div
                              key={role.id}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                                role.permissions.includes(perm.permission)
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                              title={role.name}
                            >
                              {role.permissions.includes(perm.permission) ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <RoleModal
          role={editingRole}
          onClose={() => { setShowModal(false); setEditingRole(null); }}
          onSave={async () => { setShowModal(false); await fetchRoles(); }}
        />
      )}
    </div>
  );
}

function RoleModal({ role, onClose, onSave }: { role: Role | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(role?.name || '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleCategory = (categoryPerms: string[]) => {
    const allSelected = categoryPerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !categoryPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...categoryPerms])]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (role) {
        await api.put(`/roles/${role.id}`, { name, permissions });
      } else {
        await api.post('/roles', { name, permissions });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>{role ? 'Edit Role' : 'Create Role'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Role Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="e.g. Moderator"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Permissions</label>
            <div className="mt-2 space-y-3">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                const allSelected = perms.every((p) => permissions.includes(p.permission));
                const someSelected = perms.some((p) => permissions.includes(p.permission));
                return (
                  <div key={category} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => toggleCategory(perms.map((p) => p.permission))}
                        id={`cat-${category}`}
                      />
                      <label htmlFor={`cat-${category}`} className="font-medium text-sm">
                        {category}
                      </label>
                      <Badge variant="secondary" className="text-xs">
                        {perms.filter((p) => permissions.includes(p.permission)).length}/{perms.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 ml-6">
                      {perms.map((perm) => (
                        <label
                          key={perm.permission}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={permissions.includes(perm.permission)}
                            onChange={() => togglePermission(perm.permission)}
                          />
                          {perm.description}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 sticky bottom-0 bg-card pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Role'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
