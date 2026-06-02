'use client';

import { useState } from 'react';
import { Sparkle, ArrowRight } from '@phosphor-icons/react/ssr';
import { generateNames } from '@/lib/tools/name-generator';
import { CopyButton } from '@/components/tools/copy-button';
import { LoadingSpinner } from '@/components/tools/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const STYLE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'fun', label: 'Fun' },
  { value: 'creative', label: 'Creative' },
  { value: 'minimal', label: 'Minimal' },
];

const EXAMPLE_NAMES = [
  '@fitpro.studio', '@travel.vibes', '@food.lab',
  '@creative.hub', '@minimal.co', '@get.design',
];

export function NameGeneratorUI() {
  const [keyword, setKeyword] = useState('');
  const [style, setStyle] = useState<'professional' | 'fun' | 'creative' | 'minimal'>('professional');
  const [names, setNames] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  function handleGenerate() {
    if (!keyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = generateNames(keyword, style);
      setNames(generated);
      setHasGenerated(true);
      toast.success(`Generated ${generated.length} name ideas!`);
    } catch {
      toast.error('Failed to generate names. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkle weight="bold" className="w-8 h-8 text-brand" />
            Instagram Name Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate creative, on-brand name ideas
          </p>
        </div>

        <Card className="border-border rounded-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Generate Names</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="e.g., fitness, travel, food"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-10 rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                <SelectTrigger id="style" className="min-h-10 rounded-sm">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!keyword.trim() || isGenerating}
              className="min-h-10 rounded-sm w-full"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle weight="bold" className="w-4 h-4" />
                  Generate Names
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {!hasGenerated && (
          <Card className="border-border rounded-sm mb-6 opacity-50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">Example names:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EXAMPLE_NAMES.map((name) => (
                  <div
                    key={name}
                    className="bg-card border-border rounded-sm p-3 font-mono text-sm text-muted-foreground"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasGenerated && names.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {names.map((name) => (
              <Card key={name} className="border-border rounded-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <p className="font-mono text-sm text-foreground mb-2 truncate">@{name}</p>
                  <CopyButton text={name} label="Copy" className="w-full min-h-10 rounded-sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator className="my-8" />

        <Card className="border-border rounded-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ready to build your brand?
            </h2>
            <p className="text-muted-foreground mb-4">
              Get started with SocialBeam and create a complete social media presence.
            </p>
            <Button asChild className="min-h-10 rounded-sm">
              <a href="/register">
                Get Started Free
                <ArrowRight weight="bold" className="w-4 h-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
