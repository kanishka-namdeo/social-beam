'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link as LinkIcon, ArrowRight } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { CopyButton } from '@/components/tools/copy-button';
import { toast } from 'sonner';

const MEDIUM_OPTIONS = [
  { value: 'cpc', label: 'CPC (Paid Search)' },
  { value: 'paid-social', label: 'Paid Social' },
  { value: 'social', label: 'Organic Social' },
  { value: 'email', label: 'Email' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'referral', label: 'Referral' },
  { value: 'display', label: 'Display' },
  { value: 'video', label: 'Video' },
];

function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
}

function isValidUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function UTMGeneratorUI() {
  const [baseUrl, setBaseUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleGenerate() {
    const newErrors: Record<string, string> = {};

    if (!baseUrl.trim() || !isValidUrl(baseUrl.trim())) {
      newErrors.baseUrl = 'A valid base URL starting with http:// or https:// is required';
    }

    const sanitizedSource = sanitize(utmSource);
    if (!sanitizedSource || !/^[a-z_]+$/.test(sanitizedSource)) {
      newErrors.utmSource = 'Source is required (letters and underscores only)';
    }

    if (!utmMedium) {
      newErrors.utmMedium = 'Medium is required';
    } else if (!MEDIUM_OPTIONS.some((opt) => opt.value === utmMedium)) {
      newErrors.utmMedium = 'Please select a valid medium';
    }

    if (!utmCampaign.trim() || utmCampaign.trim().length < 3) {
      newErrors.utmCampaign = 'Campaign is required (minimum 3 characters)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const url = new URL(baseUrl.trim());
    url.searchParams.set('utm_source', sanitizedSource);
    url.searchParams.set('utm_medium', utmMedium);
    url.searchParams.set('utm_campaign', sanitize(utmCampaign));
    if (utmTerm.trim()) {
      url.searchParams.set('utm_term', sanitize(utmTerm));
    }
    if (utmContent.trim()) {
      url.searchParams.set('utm_content', sanitize(utmContent));
    }

    setGeneratedUrl(url.toString());
    toast.success('UTM URL generated!');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LinkIcon weight="bold" className="w-7 h-7 text-brand" />
            UTM Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Build trackable campaign URLs
          </p>
        </div>

        {/* Input Form Card */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Campaign Parameters</CardTitle>
            <CardDescription>
              Fill in the required fields to generate your tracking URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="base-url">Base URL</Label>
              <Input
                id="base-url"
                type="url"
                placeholder="https://example.com/landing-page"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  if (errors.baseUrl) setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.baseUrl;
                    return copy;
                  });
                }}
                className="rounded-sm min-h-10"
              />
              {errors.baseUrl && (
                <p className="text-sm text-destructive">{errors.baseUrl}</p>
              )}
            </div>

            {/* UTM Source + Medium (grid) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utm-source">utm_source</Label>
                <Input
                  id="utm-source"
                  placeholder="google"
                  value={utmSource}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z_]/g, '');
                    setUtmSource(sanitized);
                    if (errors.utmSource) setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.utmSource;
                      return copy;
                    });
                  }}
                  className="rounded-sm min-h-10"
                />
                {errors.utmSource && (
                  <p className="text-sm text-destructive">{errors.utmSource}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm-medium">utm_medium</Label>
                <Select value={utmMedium} onValueChange={(v) => {
                  setUtmMedium(v);
                  if (errors.utmMedium) setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.utmMedium;
                    return copy;
                  });
                }}>
                  <SelectTrigger id="utm-medium" className="rounded-sm min-h-10">
                    <SelectValue placeholder="Select medium" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.utmMedium && (
                  <p className="text-sm text-destructive">{errors.utmMedium}</p>
                )}
              </div>
            </div>

            {/* UTM Campaign */}
            <div className="space-y-2">
              <Label htmlFor="utm-campaign">utm_campaign</Label>
              <Input
                id="utm-campaign"
                placeholder="summer-sale"
                value={utmCampaign}
                onChange={(e) => {
                  const sanitized = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\-_]/g, '');
                  setUtmCampaign(sanitized);
                  if (errors.utmCampaign) setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.utmCampaign;
                    return copy;
                  });
                }}
                className="rounded-sm min-h-10"
              />
              {errors.utmCampaign && (
                <p className="text-sm text-destructive">{errors.utmCampaign}</p>
              )}
            </div>

            {/* UTM Term + Content (grid) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utm-term">utm_term (optional)</Label>
                <Input
                  id="utm-term"
                  placeholder="running-shoes"
                  value={utmTerm}
                  onChange={(e) => setUtmTerm(sanitize(e.target.value))}
                  className="rounded-sm min-h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm-content">utm_content (optional)</Label>
                <Input
                  id="utm-content"
                  placeholder="banner-top"
                  value={utmContent}
                  onChange={(e) => setUtmContent(sanitize(e.target.value))}
                  className="rounded-sm min-h-10"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              className="w-full rounded-sm min-h-10"
            >
              <LinkIcon weight="bold" className="w-4 h-4" />
              Generate URL
            </Button>
          </CardContent>
        </Card>

        {/* Generated URL Card */}
        {generatedUrl ? (
          <Card className="rounded-sm mt-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">Generated URL</CardTitle>
                <CopyButton text={generatedUrl} />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="block p-3 bg-background rounded-sm border border-border text-sm break-all text-foreground font-mono">
                {generatedUrl}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-sm mt-6">
            <CardContent className="py-6 text-center text-muted-foreground">
              Fill all required fields
            </CardContent>
          </Card>
        )}

        <Separator className="rounded-sm my-8" />

        {/* CTA */}
        <Card className="rounded-sm bg-gradient-to-br from-brand/5 to-transparent">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  Ready to schedule, analyze, and optimize all your posts?
                </p>
                <p className="text-sm text-muted-foreground">
                  Create a free account to manage all your campaigns in one place.
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
      </div>
    </div>
  );
}
