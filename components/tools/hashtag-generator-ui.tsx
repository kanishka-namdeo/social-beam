'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hash, ArrowRight } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/tools/copy-button';
import { LoadingSpinner } from '@/components/tools/loading-spinner';
import { LandingPageShell } from '@/components/landing/landing-page-shell';
import { toast } from 'sonner';

interface Category {
  name: string;
  tags: string[];
}

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
] as const;

export function HashtagGeneratorUI() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleGenerate() {
    const trimmed = topic.trim();
    if (!trimmed) {
      toast.error('Please enter a topic or description');
      return;
    }
    if (trimmed.length > 500) {
      toast.error('Topic must be under 500 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tools/hashtag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed, platform }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error ?? 'Generation failed');
        return;
      }
      setCategories(json.data.categories ?? []);
      toast.success('Hashtags generated!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyAll() {
    const allTags = categories.flatMap((c) => c.tags).join(' ');
    navigator.clipboard.writeText(allTags);
    toast.success('All hashtags copied!');
  }

  return (
    <LandingPageShell
      hero={{
        title: 'AI hashtag generator',
        description:
          'Generate smart, categorized hashtags optimized for your platform. No signup required.',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Input Card */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Hash weight="bold" className="w-5 h-5 text-brand" />
              Generate Hashtags
            </CardTitle>
            <CardDescription>
              Enter your post topic and choose a platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform Select */}
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform" className="rounded-sm min-h-10">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Textarea */}
            <div className="space-y-2">
              <Label htmlFor="topic">Post description or topic</Label>
              <Textarea
                id="topic"
                placeholder="e.g., Tips for growing a sustainable garden in small spaces"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={500}
                className="rounded-sm min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {topic.length} / 500
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full rounded-sm min-h-10"
            >
              {loading ? (
                <>
                  <LoadingSpinner className="w-4 h-4" />
                  Generating...
                </>
              ) : (
                <>
                  <Hash weight="bold" className="w-4 h-4" />
                  Generate Hashtags
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {categories.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Generated Hashtags
              </h2>
              <Button variant="outline" onClick={handleCopyAll} className="rounded-sm min-h-10">
                Copy All
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((cat) => (
                <Card key={cat.name} className="rounded-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-sm capitalize">
                          {cat.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {cat.tags.length} tags
                        </span>
                      </div>
                      <CopyButton
                        text={cat.tags.join(' ')}
                        label="Copy"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {cat.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-sm text-brand font-mono cursor-pointer hover:text-brand/80 transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            toast.success(`Copied ${tag}`);
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator className="rounded-sm" />

            {/* CTA */}
            <Card className="rounded-sm bg-gradient-to-br from-brand/5 to-transparent">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      Want unlimited hashtag generations?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create a free account for unlimited uses and more features.
                    </p>
                  </div>
                  <Link href="/register">
                    <Button className="rounded-sm min-h-10 gap-2">
                      Get Started Free
                      <ArrowRight weight="bold" className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </LandingPageShell>
  );
}
