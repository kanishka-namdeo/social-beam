'use client';

import { useCallback, useState } from 'react';
import {
  Link,
  ArrowRight,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/tools/copy-button';
import { LinkInBioViewer } from '@/components/tools/link-in-bio-viewer';
import { LandingPageShell } from '@/components/landing/landing-page-shell';
import { toast } from 'sonner';

interface BioLink {
  id: string;
  title: string;
  url: string;
}

interface BioData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  links: BioLink[];
  theme: {
    bgColor: string;
    buttonBgColor: string;
    buttonTextColor: string;
  };
}

const THEME_PRESETS = [
  { name: 'Classic', bgColor: '#ffffff', buttonBgColor: '#000000', buttonTextColor: '#ffffff' },
  { name: 'Dark', bgColor: '#1a1a1a', buttonBgColor: '#ffffff', buttonTextColor: '#000000' },
  { name: 'Coral', bgColor: '#FFF5F2', buttonBgColor: '#FF7759', buttonTextColor: '#ffffff' },
  { name: 'Ocean', bgColor: '#F0F9FF', buttonBgColor: '#0284C7', buttonTextColor: '#ffffff' },
  { name: 'Forest', bgColor: '#F0FDF4', buttonBgColor: '#16A34A', buttonTextColor: '#ffffff' },
];

const DEFAULT_BIO_DATA: BioData = {
  handle: 'my-page',
  displayName: '',
  bio: '',
  avatarUrl: '',
  links: [{ id: crypto.randomUUID(), title: '', url: '' }],
  theme: {
    bgColor: THEME_PRESETS[2].bgColor,
    buttonBgColor: THEME_PRESETS[2].buttonBgColor,
    buttonTextColor: THEME_PRESETS[2].buttonTextColor,
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-page';
}

function loadFromStorage(handle: string): BioData | null {
  try {
    const raw = localStorage.getItem(`sb-bio-${handle}`);
    if (raw) return JSON.parse(raw) as BioData;
  } catch { /* ignore */ }
  return null;
}

export function LinkInBioBuilder() {
  const [bioData, setBioData] = useState<BioData>(() => {
    const stored = loadFromStorage(DEFAULT_BIO_DATA.handle);
    return stored ?? DEFAULT_BIO_DATA;
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  function updateBioData(partial: Partial<BioData>) {
    setBioData((prev) => ({ ...prev, ...partial }));
  }

  function handleDisplayNameChange(value: string) {
    const handle = slugify(value);
    updateBioData({ displayName: value, handle: handle || 'my-page' });
  }

  function handleAddLink() {
    updateBioData({
      links: [...bioData.links, { id: crypto.randomUUID(), title: '', url: '' }],
    });
  }

  const handleRemoveLink = useCallback((id: string) => {
    setBioData((prev) => ({
      ...prev,
      links: prev.links.length > 1 ? prev.links.filter((l) => l.id !== id) : prev.links,
    }));
  }, []);

  const handleUpdateLink = useCallback((id: string, field: 'title' | 'url', value: string) => {
    setBioData((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));
  }, []);

  const handleMoveLink = useCallback((id: string, direction: 'up' | 'down') => {
    setBioData((prev) => {
      const idx = prev.links.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.links.length) return prev;
      const newLinks = [...prev.links];
      [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
      return { ...prev, links: newLinks };
    });
  }, []);

  function handleSave() {
    if (!bioData.handle.trim()) {
      toast.error('Handle is required');
      return;
    }
    try {
      localStorage.setItem(`sb-bio-${bioData.handle}`, JSON.stringify(bioData));
      toast.success('Bio page saved!');
    } catch {
      toast.error('Failed to save bio page');
    }
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/free-tools/${encodeURIComponent(bioData.handle)}`;

  return (
    <LandingPageShell
      hero={{
        title: 'Link in Bio',
        description:
          'Create a free, customizable bio page with all your important links. No signup required.',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
          <TabsList className="mb-6">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Edit Form — 60% */}
              <div className="lg:col-span-3 space-y-6">
                {/* Profile Card */}
                <Card className="rounded-sm">
                  <CardHeader>
                    <CardTitle className="text-foreground">Profile</CardTitle>
                    <CardDescription>
                      Set up your display name, bio, and avatar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        placeholder="Your Name or Brand"
                        value={bioData.displayName}
                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                        className="rounded-sm min-h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="handle">Handle</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">/free-tools/</span>
                        <Input
                          id="handle"
                          value={bioData.handle}
                          onChange={(e) => updateBioData({ handle: slugify(e.target.value) || 'my-page' })}
                          className="rounded-sm min-h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="A short description about yourself or your brand"
                        value={bioData.bio}
                        onChange={(e) => updateBioData({ bio: e.target.value })}
                        maxLength={200}
                        className="rounded-sm min-h-[80px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {bioData.bio.length} / 200
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avatar-url">Avatar URL</Label>
                      <Input
                        id="avatar-url"
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={bioData.avatarUrl}
                        onChange={(e) => updateBioData({ avatarUrl: e.target.value })}
                        className="rounded-sm min-h-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Links Card */}
                <Card className="rounded-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Link weight="bold" className="w-5 h-5 text-brand" />
                      Links
                    </CardTitle>
                    <CardDescription>
                      Add and reorder the links on your bio page
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bioData.links.map((link, idx) => (
                      <div key={link.id} className="space-y-2 p-3 border border-border rounded-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5 text-center">
                            {idx + 1}
                          </span>
                          <Input
                            placeholder="Link title"
                            value={link.title}
                            onChange={(e) => handleUpdateLink(link.id, 'title', e.target.value)}
                            className="rounded-sm min-h-10"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveLink(link.id, 'up')}
                            disabled={idx === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveLink(link.id, 'down')}
                            disabled={idx === bioData.links.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLink(link.id)}
                            disabled={bioData.links.length <= 1}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="https://example.com"
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                          className="rounded-sm min-h-10"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={handleAddLink}
                      className="w-full rounded-sm min-h-10"
                    >
                      <Plus weight="bold" className="w-4 h-4" />
                      Add Link
                    </Button>
                  </CardContent>
                </Card>

                {/* Theme Card */}
                <Card className="rounded-sm">
                  <CardHeader>
                    <CardTitle className="text-foreground">Theme</CardTitle>
                    <CardDescription>
                      Choose a color theme for your bio page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {THEME_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() =>
                            updateBioData({
                              theme: {
                                bgColor: preset.bgColor,
                                buttonBgColor: preset.buttonBgColor,
                                buttonTextColor: preset.buttonTextColor,
                              },
                            })
                          }
                          className={`flex flex-col items-center gap-2 p-3 border-2 rounded-sm transition-all ${
                            bioData.theme.bgColor === preset.bgColor &&
                            bioData.theme.buttonBgColor === preset.buttonBgColor
                              ? 'border-brand'
                              : 'border-border hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex gap-1">
                            <div
                              className="w-6 h-6 rounded-sm border border-border"
                              style={{ backgroundColor: preset.bgColor }}
                            />
                            <div
                              className="w-6 h-6 rounded-sm"
                              style={{ backgroundColor: preset.buttonBgColor }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Preview — 40% */}
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <Card className="rounded-2xl overflow-hidden border-border max-w-sm mx-auto">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Live Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      <div
                        className="rounded-t-xl overflow-hidden"
                        style={{ minHeight: '400px' }}
                      >
                        <LinkInBioViewer
                          initialData={bioData}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Save & Share */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Share your bio page</p>
                <code className="text-xs text-muted-foreground block">
                  {shareUrl}
                </code>
              </div>
              <div className="flex gap-2">
                <CopyButton text={shareUrl} label="Copy URL" className="rounded-sm min-h-10" />
                <Button onClick={handleSave} className="rounded-sm min-h-10 gap-2">
                  Save Bio Page
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="flex justify-center">
              <Card className="rounded-2xl overflow-hidden border-border max-w-sm w-full">
                <CardContent className="p-0">
                  <LinkInBioViewer initialData={bioData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LandingPageShell>
  );
}
