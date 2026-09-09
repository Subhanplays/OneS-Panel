import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Braces,
  Copy,
  Send,
  Plus,
  Trash2,
  Eye,
  Image,
  Link,
  Clock,
  User,
  AlignLeft,
} from 'lucide-react';

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  title: string;
  description: string;
  color: number;
  author: { name: string; icon_url: string };
  footer: { text: string; icon_url: string };
  thumbnail: { url: string };
  image: { url: string };
  url: string;
  timestamp: string | null;
  fields: EmbedField[];
}

const defaultEmbed: EmbedData = {
  title: '',
  description: '',
  color: 5814783,
  author: { name: '', icon_url: '' },
  footer: { text: '', icon_url: '' },
  thumbnail: { url: '' },
  image: { url: '' },
  url: '',
  timestamp: null,
  fields: [],
};

export function EmbedBuilderPage() {
  const [embed, setEmbed] = useState<EmbedData>({ ...defaultEmbed });
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);

  const handleAddField = () => {
    setEmbed({
      ...embed,
      fields: [...embed.fields, { name: '', value: '', inline: false }],
    });
  };

  const handleRemoveField = (index: number) => {
    setEmbed({
      ...embed,
      fields: embed.fields.filter((_, i) => i !== index),
    });
  };

  const handleFieldChange = (index: number, key: keyof EmbedField, value: any) => {
    const newFields = [...embed.fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setEmbed({ ...embed, fields: newFields });
  };

  const handleCopyJson = async () => {
    const json = buildEmbedJson();
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildEmbedJson = () => {
    const json: any = {};
    if (embed.title) json.title = embed.title;
    if (embed.description) json.description = embed.description;
    json.color = embed.color;
    if (embed.url) json.url = embed.url;
    if (embed.author.name) json.author = { ...embed.author };
    if (embed.footer.text) json.footer = { ...embed.footer };
    if (embed.thumbnail.url) json.thumbnail = { url: embed.thumbnail.url };
    if (embed.image.url) json.image = { url: embed.image.url };
    if (embed.timestamp) json.timestamp = new Date().toISOString();
    if (embed.fields.length > 0) {
      json.fields = embed.fields.filter((f) => f.name || f.value);
    }
    return json;
  };

  const handleLoadBots = async () => {
    try {
      const response = await api.get('/bots');
      setBots(response.data.data || []);
      setShowSendModal(true);
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
  };

  const handleLoadChannels = async (botId: string) => {
    setSelectedBot(botId);
    try {
      const response = await api.get(`/bots/${botId}/channels`);
      setChannels(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  const handleSendToChannel = async () => {
    if (!selectedBot || !selectedChannel) return;
    setSending(true);
    try {
      const json = buildEmbedJson();
      await api.post(`/bots/${selectedBot}/channels/${selectedChannel}/messages`, {
        embeds: [json],
      });
      setShowSendModal(false);
      setSelectedBot('');
      setSelectedChannel('');
    } catch (err) {
      console.error('Failed to send embed:', err);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setEmbed({ ...defaultEmbed, fields: [] });
  };

  const colorIntToHex = (color: number) => {
    return '#' + color.toString(16).padStart(6, '0');
  };

  const hexToInt = (hex: string) => {
    return parseInt(hex.replace('#', ''), 16) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Embed Builder</h1>
          <p className="text-muted-foreground">Build and preview Discord embeds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} size="sm">
            Reset
          </Button>
          <Button variant="outline" onClick={handleCopyJson} size="sm">
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
          <Button onClick={handleLoadBots} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send to Channel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Braces className="h-5 w-5" />
                Embed Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={embed.title}
                  onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                  placeholder="Embed title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={embed.description}
                  onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                  placeholder="Embed description"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={colorIntToHex(embed.color)}
                      onChange={(e) => setEmbed({ ...embed, color: hexToInt(e.target.value) })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={colorIntToHex(embed.color)}
                      onChange={(e) => setEmbed({ ...embed, color: hexToInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={embed.url}
                      onChange={(e) => setEmbed({ ...embed, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!embed.timestamp}
                  onChange={(e) => setEmbed({ ...embed, timestamp: e.target.checked ? new Date().toISOString() : null })}
                  id="timestamp"
                />
                <label htmlFor="timestamp" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Include Timestamp
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Author */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Author
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Author Name</label>
                <Input
                  value={embed.author.name}
                  onChange={(e) => setEmbed({ ...embed, author: { ...embed.author, name: e.target.value } })}
                  placeholder="Author name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Author Icon URL</label>
                <Input
                  value={embed.author.icon_url}
                  onChange={(e) => setEmbed({ ...embed, author: { ...embed.author, icon_url: e.target.value } })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlignLeft className="h-5 w-5" />
                Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Footer Text</label>
                <Input
                  value={embed.footer.text}
                  onChange={(e) => setEmbed({ ...embed, footer: { ...embed.footer, text: e.target.value } })}
                  placeholder="Footer text"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Footer Icon URL</label>
                <Input
                  value={embed.footer.icon_url}
                  onChange={(e) => setEmbed({ ...embed, footer: { ...embed.footer, icon_url: e.target.value } })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Thumbnail URL</label>
                <Input
                  value={embed.thumbnail.url}
                  onChange={(e) => setEmbed({ ...embed, thumbnail: { url: e.target.value } })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  value={embed.image.url}
                  onChange={(e) => setEmbed({ ...embed, image: { url: e.target.value } })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fields</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {embed.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No fields added yet</p>
              ) : (
                embed.fields.map((field, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Field {index + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveField(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Name</label>
                      <Input
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="Field name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Value</label>
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        placeholder="Field value"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.inline}
                        onChange={(e) => handleFieldChange(index, 'inline', e.target.checked)}
                        id={`inline-${index}`}
                      />
                      <label htmlFor={`inline-${index}`} className="text-xs text-muted-foreground">
                        Inline
                      </label>
                    </div>
                  </div>
                ))
              )}
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
            <CardContent>
              <div className="bg-[#2f3136] rounded-lg p-4 max-w-lg">
                <div className="flex">
                  <div
                    className="w-1 rounded-l-md flex-shrink-0"
                    style={{ backgroundColor: colorIntToHex(embed.color) }}
                  />
                  <div className="flex-1 min-w-0 p-3">
                    {embed.author.name && (
                      <div className="flex items-center gap-2 mb-1">
                        {embed.author.icon_url && (
                          <img
                            src={embed.author.icon_url}
                            alt=""
                            className="w-6 h-6 rounded-full"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <span className="text-xs font-semibold text-white">{embed.author.name}</span>
                      </div>
                    )}
                    {embed.title && (
                      <div className="font-semibold text-white mb-1">
                        {embed.url ? (
                          <span className="text-blue-400 hover:underline cursor-pointer">{embed.title}</span>
                        ) : (
                          embed.title
                        )}
                      </div>
                    )}
                    {embed.description && (
                      <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap">{embed.description}</p>
                    )}
                    {embed.fields.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {embed.fields.map((field, i) => (
                          <div key={i} className={field.inline ? '' : 'col-span-2'}>
                            <div className="text-xs font-semibold text-white">{field.name}</div>
                            <div className="text-xs text-gray-300">{field.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {embed.thumbnail.url && (
                      <img
                        src={embed.thumbnail.url}
                        alt=""
                        className="float-right w-16 h-16 rounded ml-4 mb-2 object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    {embed.image.url && (
                      <img
                        src={embed.image.url}
                        alt=""
                        className="w-full rounded mt-2 max-h-64 object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    {embed.footer.text && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-600/50">
                        {embed.footer.icon_url && (
                          <img
                            src={embed.footer.icon_url}
                            alt=""
                            className="w-4 h-4 rounded-full"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <span className="text-xs text-gray-400">{embed.footer.text}</span>
                        {embed.timestamp && (
                          <span className="text-xs text-gray-400">
                            • {new Date().toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">JSON Output</h4>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-64 font-mono">
                  {JSON.stringify(buildEmbedJson(), null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Send Embed to Channel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Bot</label>
                <select
                  value={selectedBot}
                  onChange={(e) => handleLoadChannels(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select a bot...</option>
                  {bots.map((bot: any) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedBot && (
                <div>
                  <label className="text-sm font-medium">Select Channel</label>
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSendModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendToChannel} disabled={!selectedBot || !selectedChannel || sending}>
                  {sending ? 'Sending...' : 'Send Embed'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
