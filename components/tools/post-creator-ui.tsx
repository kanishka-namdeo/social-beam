'use client';

import { useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/tools/copy-button';
import { LoadingSpinner } from '@/components/tools/loading-spinner';
import { PLATFORMS, TONES } from '@/lib/tools/schemas';
import { toast } from 'sonner';
import Link from 'next/link';

export function PostCreatorUI() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    setResult('');
    setEditedContent('');

    try {
      const response = await fetch('/api/tools/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, tone }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? 'Generation failed');
        return;
      }

      const content = json.data.content as string;
      setResult(content);
      setEditedContent(content);
      toast.success('Post generated successfully');
    } catch {
      toast.error('Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRegenerate() {
    handleGenerate();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            AI Post Creator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate ready-to-publish social media posts in seconds
          </p>
        </div>

        <Card className="rounded-sm border-border">
          <CardHeader>
            <CardTitle>Create Your Post</CardTitle>
            <CardDescription>
              Enter your topic and customize the output
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., The future of remote work in 2026"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={500}
                className="rounded-sm min-h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
                  <SelectTrigger id="platform" className="rounded-sm min-h-10">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger id="tone" className="rounded-sm min-h-10">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-sm min-h-10"
            >
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate Post'
              )}
            </Button>
          </CardContent>
        </Card>

        {editedContent && (
          <Card className="rounded-sm border-border mt-6">
            <CardHeader>
              <CardTitle>Generated Post</CardTitle>
              <CardDescription>
                Edit before copying
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="rounded-sm min-h-[120px] resize-y"
              />
              <div className="flex items-center gap-3">
                <CopyButton
                  text={editedContent}
                  label="Copy Post"
                  className="rounded-sm min-h-10"
                />
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="rounded-sm min-h-10"
                >
                  {loading ? (
                    <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Regenerating...
                    </>
                  ) : (
                    'Regenerate'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Ready to schedule, analyze, and optimize all your posts?
          </p>
          <Link href="/register">
            <Button className="rounded-sm min-h-10">
              Get Started Free
              <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
