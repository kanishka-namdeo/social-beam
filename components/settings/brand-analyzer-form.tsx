"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Sparkle,
  Warning,
  CheckCircle,
  Users,
  Article,
} from "@phosphor-icons/react/ssr";

interface AnalysisResult {
  brandContextDraft: Record<string, unknown>;
  platformContextsDraft: Record<string, unknown>[];
  samplePosts: unknown[];
  status: string;
}

export function BrandAnalyzerForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/brand-context/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Analysis failed. Please try again.");
        return;
      }

      setResult(json.data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const brand = result.brandContextDraft as Record<string, string | string[]>;
    const platformCount = result.platformContextsDraft.length;
    const samplePostCount = result.samplePosts.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="size-5 text-success" weight="fill" />
            Analysis Complete
          </CardTitle>
          <CardDescription>
            Review the brand profile extracted from your website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {brand.businessName && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Brand Name
                </p>
                <p className="text-sm font-medium text-foreground">
                  {brand.businessName}
                </p>
              </div>
            )}
            {brand.industry && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Industry
                </p>
                <p className="text-sm text-foreground">
                  {brand.industry}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Globe className="size-3" />
              {platformCount} platform{platformCount !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Article className="size-3" />
              {samplePostCount} sample post{samplePostCount !== 1 ? "s" : ""}
            </Badge>
            {brand.tonePreset && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkle className="size-3" weight="fill" />
                {brand.tonePreset}
              </Badge>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => router.push("/settings/brand")}
              className="min-h-10"
            >
              Save &amp; Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setUrl("");
              }}
              className="min-h-10"
            >
              Analyze Another URL
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Analyze Your Brand
        </CardTitle>
        <CardDescription>
          Enter your website URL to automatically extract your brand voice, audience, and platform strategy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-url" className="text-sm font-medium">
              Website URL
            </Label>
            <div className="flex gap-3">
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="min-h-10 border-border focus-within:border-brand"
              />
              <Button type="submit" disabled={loading || !url} className="min-h-10">
                {loading ? (
                  <>
                    <Sparkle className="size-4 animate-spin" weight="fill" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkle className="size-4" weight="fill" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <Warning className="size-4" weight="fill" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Audience profiling
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkle className="size-3.5" weight="fill" />
              Voice extraction
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="size-3.5" />
              Platform strategies
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
