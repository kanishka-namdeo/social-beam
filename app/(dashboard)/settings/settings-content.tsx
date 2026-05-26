"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaintBrush, LinkSimple, ShieldCheck, ArrowRight, CheckCircle, Warning, Clock, InstagramLogo, XLogo, LinkedinLogo, MetaLogo, TiktokLogo, PinterestLogo, Desktop } from "@phosphor-icons/react/ssr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";
import { SidebarVariantSwitcher } from "@/components/dashboard/sidebar-variant-switcher";

const statusBadge: Record<string, { variant: "default" | "secondary" | "outline"; icon: React.ReactNode; label: string }> = {
  trained: { variant: "default", icon: <CheckCircle className="size-3" weight="fill" />, label: "Trained" },
  needs_refresh: { variant: "outline", icon: <Warning className="size-3" weight="fill" />, label: "Needs Refresh" },
  untrained: { variant: "secondary", icon: <Clock className="size-3" />, label: "Untrained" },
};

interface ConnectedAccount {
  platform: string;
  platformUsername?: string;
  avatarUrl?: string;
  status: string;
  lastSyncedAt?: string;
}

async function initiateOAuth(platform: string, redirectTo: string): Promise<{ authUrl?: string; error?: string }> {
  try {
    const response = await fetch("/api/onboarding/oauth/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, redirectTo }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return { error: data.error ?? "Failed to initiate OAuth" };
    }

    const data = (await response.json()) as { authUrl?: string };
    return { authUrl: data.authUrl };
  } catch {
    return { error: "An unexpected error occurred" };
  }
}

async function fetchConnectedAccounts(): Promise<ConnectedAccount[]> {
  try {
    const res = await fetch("/api/settings/accounts");
    if (!res.ok) return [];
    const data = (await res.json()) as { accounts?: ConnectedAccount[] };
    return data.accounts ?? [];
  } catch {
    return [];
  }
}

function openOAuthPopup(authUrl: string, platform: string): Window | null {
  const width = 600;
  const height = 700;
  const left = typeof window !== "undefined" ? window.screen.width / 2 - width / 2 : 0;
  const top = typeof window !== "undefined" ? window.screen.height / 2 - height / 2 : 0;
  return window.open(
    authUrl,
    `oauth-${platform}`,
    `width=${width},height=${height},left=${left},top=${top}`,
  );
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-5" weight="fill" />,
  facebook: <MetaLogo className="size-5" weight="fill" />,
  x: <XLogo className="size-5" weight="fill" />,
  linkedin: <LinkedinLogo className="size-5" weight="fill" />,
  tiktok: <TiktokLogo className="size-5" weight="fill" />,
  pinterest: <PinterestLogo className="size-5" weight="fill" />,
};

function PlatformConnectButton({ platform, label }: { platform: string; label: string }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    const result = await initiateOAuth(platform, "settings");

    if (result.error) {
      setError(result.error);
      toast.error(`Failed to connect ${label}`, { description: result.error });
      setConnecting(false);
      return;
    }

    if (!result.authUrl) {
      setError("No auth URL returned");
      toast.error(`Failed to connect ${label}`, { description: "No authorization URL was returned." });
      setConnecting(false);
      return;
    }

    const popup = openOAuthPopup(result.authUrl, platform);

    if (!popup) {
      window.location.href = result.authUrl;
      setConnecting(false);
      return;
    }

    const poll = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting(false);
          window.location.reload();
        }
      } catch {
        // Cross-origin popup, can't check — just wait for redirect
      }
    }, 500);

    setTimeout(() => {
      clearInterval(poll);
      setConnecting(false);
    }, 120_000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        className="flex h-auto w-full flex-col items-center gap-2 p-4 text-center hover:bg-muted/50 transition-colors"
        onClick={handleConnect}
        disabled={connecting}
      >
        <span className="text-muted-foreground" aria-hidden="true">
          {platformIcons[platform]}
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {connecting && (
          <span className="text-xs text-muted-foreground">Connecting...</span>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center break-all px-1">{error}</p>
      )}
    </div>
  );
}

export function SettingsContent({
  brandContext,
}: {
  brandContext: { trainingStatus?: string | null; lastTrainedAt?: Date | null } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") ?? "overview";

  const [tabLoading, setTabLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const setTab = useCallback(
    (value: string) => {
      if (!["overview", "accounts", "ai", "navigation"].includes(value)) {
        value = "overview";
      }
      setTabLoading(true);
      router.push(value === "overview" ? "/settings" : `/settings?tab=${value}`, { scroll: false });
      setTimeout(() => setTabLoading(false), 300);
    },
    [router],
  );

  const status = brandContext?.trainingStatus ?? "untrained";
  const badgeConfig = statusBadge[status] ?? statusBadge.untrained;

  // Handle OAuth success/error from URL params using window.location (avoids SSR hydration mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("oauth");
    const platform = params.get("platform") ?? "unknown";

    if (oauthStatus === "success") {
      toast.success(`${platform} connected`, {
        description: "Your account has been linked successfully.",
      });
      // Clean URL
      window.history.replaceState({}, "", "/settings?tab=accounts");
      fetchConnectedAccounts().then(setConnectedAccounts);
    } else if (oauthStatus === "error") {
      const reason = params.get("reason") ?? "unknown";
      toast.error(`Failed to connect ${platform}`, {
        description: reason === "missing_code"
          ? "Authorization code was not received from the platform."
          : reason === "missing_token_or_user_id"
            ? "The platform did not return a valid token or user ID."
            : `OAuth error: ${reason}. Please try again.`,
        duration: 6000,
      });
      window.history.replaceState({}, "", "/settings?tab=accounts");
    }
  }, []);

  // Fetch connected accounts when accounts tab is active
  useEffect(() => {
    if (tab === "accounts") {
      requestAnimationFrame(() => setAccountsLoading(true));
      fetchConnectedAccounts().then((accounts) => {
        setConnectedAccounts(accounts);
        setAccountsLoading(false);
      });
    }
  }, [tab]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="h-10">
        <TabsTrigger value="overview" className="data-[state=active]:text-brand data-[state=active]:border-brand border-b-2 border-transparent">Overview</TabsTrigger>
        <TabsTrigger value="accounts" className="data-[state=active]:text-brand data-[state=active]:border-brand border-b-2 border-transparent">Connected Accounts</TabsTrigger>
        <TabsTrigger value="ai" className="data-[state=active]:text-brand data-[state=active]:border-brand border-b-2 border-transparent">AI Guardrails</TabsTrigger>
        <TabsTrigger value="navigation" className="data-[state=active]:text-brand data-[state=active]:border-brand border-b-2 border-transparent">Navigation</TabsTrigger>
      </TabsList>

      {tabLoading ? (
        <div className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <TabsContent value="overview" className="space-y-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Brand Context Card */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PaintBrush className="size-5 text-brand" weight="fill" />
                    Brand Context
                  </CardTitle>
                  <CardDescription>
                    Train and manage your brand voice, tone, and audience profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeConfig.variant} className="flex items-center gap-1">
                      {badgeConfig.icon}
                      {badgeConfig.label}
                    </Badge>
                    {brandContext?.lastTrainedAt && (
                      <span className="text-xs text-muted-foreground">
                        Last trained {new Date(brandContext.lastTrainedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Link href="/settings/brand">
                    <Card className="group flex items-center justify-between rounded-lg border-border p-3 hover:bg-accent transition-colors cursor-pointer">
                      <span className="text-sm text-foreground">Configure brand context</span>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </Card>
                  </Link>
                </CardContent>
              </Card>

              {/* Connected Accounts */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkSimple className="size-5 text-brand" weight="fill" />
                    Connected Accounts
                  </CardTitle>
                  <CardDescription>
                    Link your social media profiles to start publishing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-lg border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("accounts")}
                  >
                    <span className="text-sm text-foreground">Manage accounts</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* AI Guardrails */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-5 text-brand" weight="fill" />
                    AI Guardrails
                  </CardTitle>
                  <CardDescription>
                    Configure autonomy levels, safety filters, and disclosure settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-lg border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("ai")}
                  >
                    <span className="text-sm text-foreground">Configure guardrails</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Navigation */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Desktop className="size-5 text-brand" weight="fill" />
                    Navigation
                  </CardTitle>
                  <CardDescription>
                    Customize sidebar layout, style, and collapse behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-lg border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("navigation")}
                  >
                    <span className="text-sm text-foreground">Customize sidebar</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkSimple className="size-5 text-brand" weight="fill" />
                  Connected Accounts
                </CardTitle>
                <CardDescription>
                  Connect your social accounts to start scheduling posts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Connected accounts list */}
                {accountsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : connectedAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.platform}
                        className="flex items-center gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          {platformIcons[account.platform]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {account.platformUsername ?? account.platform}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                        </div>
                        <Badge
                          variant={account.status === "connected" ? "default" : "outline"}
                          className="bg-success/20 text-success border-success/30"
                        >
                          {account.status === "connected" ? "Connected" : account.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
                    <LinkSimple className="size-8 text-muted-foreground" weight="light" />
                    <p className="text-sm text-muted-foreground">
                      No accounts connected yet. Connect a social account to manage integrations.
                    </p>
                  </div>
                )}

                {/* Quick-connect CTAs */}
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Connect more platforms
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <PlatformConnectButton platform="instagram" label="Instagram" />
                    <PlatformConnectButton platform="facebook" label="Facebook" />
                    <PlatformConnectButton platform="x" label="X (Twitter)" />
                    <PlatformConnectButton platform="linkedin" label="LinkedIn" />
                    <PlatformConnectButton platform="tiktok" label="TikTok" />
                    <PlatformConnectButton platform="pinterest" label="Pinterest" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="size-5 text-brand" weight="fill" />
                  AI Guardrails
                </CardTitle>
                <CardDescription>
                  Configure AI autonomy levels, safety filters, and disclosure settings for content generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
                <ShieldCheck className="size-8 text-muted-foreground" weight="light" />
                <p className="text-sm text-muted-foreground">
                  AI guardrails configuration coming soon. Default safety settings are active.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Desktop className="size-5 text-brand" weight="fill" />
                  Navigation
                </CardTitle>
                <CardDescription>
                  Choose how your sidebar looks and behaves.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SidebarVariantSwitcher />
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
