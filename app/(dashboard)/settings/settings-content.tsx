"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaintBrush, LinkSimple, ShieldCheck, ArrowRight, CheckCircle, Warning, Clock, InstagramLogo, XLogo, LinkedinLogo, MetaLogo, TiktokLogo, PinterestLogo, Desktop, Code, ThreadsLogo, GoogleLogo, YoutubeLogo, ChatCircleText, Eye, Sparkle, CreditCard, Bell, AddressBook, PenNib } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DisconnectDialog } from "@/app/(dashboard)/dashboard/settings/components/disconnect-dialog";
import { LinkedInUnifiedDialog } from "@/app/(dashboard)/dashboard/settings/components/linkedin-unified-dialog";
import Link from "next/link";
import { toast } from "sonner";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { SidebarVariantSwitcher } from "@/components/dashboard/sidebar-variant-switcher";
import { useInvisibleAI } from "@/lib/invisible-ai-context";
import { getDisplayName } from "@/lib/oauth/platform-registry";
import type { UserRole } from "@/lib/role-guard";
import { NotificationsTab } from "@/app/(dashboard)/settings/notifications-tab";
import { McpTab } from "@/app/(dashboard)/settings/mcp-tab";
import { SignatureTab } from "@/components/settings/signature-tab";
import { SyncButton } from "@/components/sync/sync-button";
import { isSyncAvailable } from "@/lib/sync/platform-capabilities";

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

/**
 * Determine if a LinkedIn account is fully connected (has both OAuth token and session cookie).
 * The API returns `pending_session` status for LinkedIn accounts that have OAuth but no session cookie.
 */
function isAccountFullyConnected(account: ConnectedAccount): boolean {
  if (account.platform === 'linkedin') {
    return account.status === 'connected';
  }
  return account.status === 'connected';
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
  threads: <ThreadsLogo className="size-5" weight="fill" />,
  googleBusiness: <GoogleLogo className="size-5" weight="fill" />,
  youtube: <YoutubeLogo className="size-5" weight="fill" />,
  bluesky: <ChatCircleText className="size-5" weight="fill" />,
};

function PlatformConnectButton({ platform, label, onLinkedinConnect }: { platform: string; label: string; onLinkedinConnect?: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleConnect = async () => {
    // Route LinkedIn through the unified dialog to ensure cookie extraction
    if (platform === 'linkedin' && onLinkedinConnect) {
      onLinkedinConnect();
      return;
    }

    setConnecting(true);
    setError(null);

    const result = await initiateOAuth(platform, "settings");

    if (!mountedRef.current) return;

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
          pollIntervalRef.current = null;
          if (mountedRef.current) setConnecting(false);
          window.location.reload();
        }
      } catch {
        // Cross-origin popup, can't check — just wait for redirect
      }
    }, 500);
    pollIntervalRef.current = poll;

    timeoutRef.current = setTimeout(() => {
      clearInterval(poll);
      pollIntervalRef.current = null;
      timeoutRef.current = null;
      if (mountedRef.current) setConnecting(false);
    }, 120_000);
  };

  return (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex h-auto w-full flex-col items-center gap-2 p-4 text-center hover:bg-accent/50 transition-colors rounded-sm"
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
                      <p className="text-xs text-destructive text-center break-all px-1" role="alert">{error}</p>
                    )}
                  </div>
  );
}

function DeveloperAppsTabContent() {
  const [apps, setApps] = useState<Array<{ platform: string; isConfigured: boolean; hasClientId: boolean; hasSecret: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [configuringPlatform, setConfiguringPlatform] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch("/api/settings/oauth-apps", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setApps(data.apps ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const handleSave = async () => {
    if (!configuringPlatform || !clientId || !clientSecret) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/oauth-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: configuringPlatform,
          clientId,
          clientSecret,
        }),
      });
      if (res.ok) {
        toast.success(`${configuringPlatform} credentials saved`);
        setApps((prev) =>
          prev.map((a) =>
            a.platform === configuringPlatform
              ? { ...a, isConfigured: true, hasClientId: true, hasSecret: true }
              : a,
          ),
        );
        setConfiguringPlatform(null);
        setClientId("");
        setClientSecret("");
      } else {
        toast.error("Failed to save credentials");
      }
    } catch {
      toast.error("Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-sm border border-border p-4">
                <Skeleton className="h-10 w-10 rounded-sm" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Code className="size-5 text-brand" weight="fill" />
            Developer App Credentials
          </CardTitle>
          <CardDescription>
            Create OAuth apps on each platform&apos;s developer portal and paste the credentials below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!apps.some((a) => a.isConfigured) && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
              <Code className="size-8 text-muted-foreground" weight="light" />
              <p className="text-sm font-medium text-foreground">No developer apps configured yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                You&apos;ll need to create OAuth apps on each platform to enable full integrations.
              </p>
            </div>
          )}
          {apps.map((app) => (
            <div
              key={app.platform}
              className="flex items-center justify-between rounded-sm border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {platformIcons[app.platform]}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {getDisplayName(app.platform)}
                  </p>
                  {app.isConfigured ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="size-3 text-success" weight="fill" />
                      Configured
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Warning className="size-3" weight="fill" />
                      Not configured
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {app.isConfigured && (
                  <Badge variant="default" className="text-micro normal-case tracking-tight bg-success/20 text-success border-success/30">
                    Active
                  </Badge>
                )}
                <Button
                  variant={app.isConfigured ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    setConfiguringPlatform(app.platform);
                    setClientId("");
                    setClientSecret("");
                  }}
                >
                  {app.isConfigured ? "Edit" : "Configure"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {configuringPlatform && (
        <Dialog open={configuringPlatform != null} onOpenChange={() => setConfiguringPlatform(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {platformIcons[configuringPlatform]}
                Configure {configuringPlatform === "x" ? "X (Twitter)" : configuringPlatform} App
              </DialogTitle>
              <DialogDescription>
                Paste your OAuth Client ID and Client Secret from the platform&apos;s developer portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Paste your Client ID" />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Paste your Client Secret" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfiguringPlatform(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !clientId || !clientSecret}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function SettingsContent({
  brandContext,
  userRole,
}: {
  brandContext: { trainingStatus?: string | null; lastTrainedAt?: Date | null } | null;
  userRole: UserRole;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") ?? "overview";

  const [tabLoading, setTabLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [linkedinUnifiedDialogOpen, setLinkedinUnifiedDialogOpen] = useState(false);
  const [linkedinHasOAuth, setLinkedinHasOAuth] = useState(false);

  const handleDisconnectSuccess = useCallback(() => {
    fetchConnectedAccounts().then(setConnectedAccounts);
    notifySuccessWithCategory("Account disconnected", { category: "connection" });
    setDisconnectingPlatform(null);
  }, []);

  const handleLinkedinComplete = useCallback(() => {
    fetchConnectedAccounts().then(setConnectedAccounts);
    setLinkedinUnifiedDialogOpen(false);
  }, []);

  const setTab = useCallback(
    (value: string) => {
      if (!["overview", "accounts", "developer", "ai", "navigation", "notifications", "mcp", "contacts", "signatures"].includes(value)) {
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
  const isAdmin = userRole === "ADMIN";

  // Redirect non-admins away from developer tab if they land there via URL
  useEffect(() => {
    if (!isAdmin && tab === "developer") {
      router.replace("/settings", { scroll: false });
    }
  }, [isAdmin, tab, router]);

  // Handle OAuth success/error from URL params using window.location (avoids SSR hydration mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("oauth");
    const platform = params.get("platform") ?? "unknown";

    if (oauthStatus === "success") {
      notifySuccessWithCategory(`${platform} connected`, {
        category: "connection",
        description: "Your account has been linked successfully.",
      });
      // Clean URL
      window.history.replaceState({}, "", "/settings?tab=accounts");
      fetchConnectedAccounts().then(setConnectedAccounts);
    } else if (oauthStatus === "error") {
      const reason = params.get("reason") ?? "unknown";
      notifyErrorWithCategory(`Failed to connect ${platform}`, {
        category: "connection",
        description: reason === "missing_code"
          ? "Authorization code was not received from the platform."
          : reason === "missing_token_or_user_id"
            ? "The platform did not return a valid token or user ID."
            : `OAuth error: ${reason}. Please try again.`,
      });
      window.history.replaceState({}, "", "/settings?tab=accounts");
    }
  }, []);

  // Fetch connected accounts when accounts tab is active
  useEffect(() => {
    if (tab === "accounts") {
      let cancelled = false;
      requestAnimationFrame(() => setAccountsLoading(true));
      fetchConnectedAccounts().then((accounts) => {
        if (!cancelled) {
          setConnectedAccounts(accounts);
          setAccountsLoading(false);
        }
      });
      return () => { cancelled = true; };
    }
  }, [tab]);

  return (
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="h-10 gap-0 bg-transparent p-0 border-b border-border">
        <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Overview</TabsTrigger>
        <TabsTrigger value="accounts" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Connected Accounts</TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="developer" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Developer Apps</TabsTrigger>
        )}
        <TabsTrigger value="ai" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">AI Guardrails</TabsTrigger>
        <TabsTrigger value="navigation" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Navigation</TabsTrigger>
        <TabsTrigger value="notifications" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Notifications</TabsTrigger>
        <TabsTrigger value="contacts" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Contacts</TabsTrigger>
        <TabsTrigger value="signatures" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Signatures</TabsTrigger>
        <TabsTrigger value="mcp" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">MCP</TabsTrigger>
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
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
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
                    <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer">
                      <span className="text-sm text-foreground tracking-tight">Configure brand context</span>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </Card>
                  </Link>
                </CardContent>
              </Card>

              {/* Connected Accounts */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <LinkSimple className="size-5 text-brand" weight="fill" />
                    Connected Accounts
                  </CardTitle>
                  <CardDescription>
                    Link your social media profiles to start publishing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("accounts")}
                  >
                    <span className="text-sm text-foreground tracking-tight">Manage accounts</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* AI Guardrails */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <ShieldCheck className="size-5 text-brand" weight="fill" />
                    AI Guardrails
                  </CardTitle>
                  <CardDescription>
                    Configure autonomy levels, safety filters, and disclosure settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("ai")}
                  >
                    <span className="text-sm text-foreground tracking-tight">Configure guardrails</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Navigation */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <Desktop className="size-5 text-brand" weight="fill" />
                    Navigation
                  </CardTitle>
                  <CardDescription>
                    Customize sidebar layout, style, and collapse behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("navigation")}
                  >
                    <span className="text-sm text-foreground tracking-tight">Customize sidebar</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Billing & Subscription */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <CreditCard className="size-5 text-brand" weight="fill" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription, payment methods, and billing history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => router.push('/billing')}
                  >
                    <span className="text-sm text-foreground tracking-tight">Manage billing</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <Bell className="size-5 text-brand" weight="fill" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Control notification channels, categories, and email digest frequency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("notifications")}
                  >
                    <span className="text-sm text-foreground tracking-tight">Manage preferences</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <AddressBook className="size-5 text-brand" weight="fill" />
                    Contacts
                  </CardTitle>
                  <CardDescription>
                    Manage saved contacts for mention autocomplete in posts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => router.push('/settings/contacts')}
                  >
                    <span className="text-sm text-foreground tracking-tight">Manage contacts</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>

              {/* Signatures */}
              <Card className="flex flex-col rounded-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                    <PenNib className="size-5 text-brand" weight="fill" />
                    Signatures
                  </CardTitle>
                  <CardDescription>
                    Customize post signatures to brand your content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end">
                  <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setTab("signatures")}
                  >
                    <span className="text-sm text-foreground tracking-tight">Manage signatures</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 tracking-tight">
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
                      <div key={i} className="flex items-center gap-4 rounded-sm border border-border p-4">
                        <Skeleton className="h-10 w-10 rounded-sm" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : connectedAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {connectedAccounts.map((account) => {
                      const fullyConnected = isAccountFullyConnected(account);
                      const isLinkedInPartial = account.platform === 'linkedin' && account.status === 'pending_session';
                      return (
                      <div
                        key={account.platform}
                        className="flex items-center gap-4 rounded-sm border border-border p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                          {platformIcons[account.platform]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {account.platformUsername ?? account.platform}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                        </div>
                        {fullyConnected ? (
                          <Badge
                            variant="outline"
                            className="rounded-sm bg-success/20 text-success border-success/30"
                          >
                            Connected
                          </Badge>
                        ) : isLinkedInPartial ? (
                          <Badge
                            variant="default"
                            className="rounded-sm"
                          >
                            OAuth only — needs session
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-sm"
                          >
                            {account.status}
                          </Badge>
                        )}
                        {fullyConnected && (
                          <div className="flex items-center gap-2">
                            {account.platform === "linkedin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-sm gap-1"
                                onClick={() => {
                                  setLinkedinHasOAuth(true);
                                  setLinkedinUnifiedDialogOpen(true);
                                }}
                              >
                                <span className="size-3 rounded-full bg-[#0A66C2]" />
                                Configure
                              </Button>
                            )}
                            {isSyncAvailable(account.platform) ? (
                              <SyncButton
                                platform={account.platform}
                                variant="outline"
                                size="sm"
                                className="rounded-sm"
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-sm"
                                disabled
                                title="Sync not available for this platform yet"
                              >
                                Coming soon
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-sm"
                              onClick={() => setDisconnectingPlatform(account.platform)}
                            >
                              Disconnect
                            </Button>
                          </div>
                        )}
                        {isLinkedInPartial && (
                          <Button
                            variant="default"
                            size="sm"
                            className="rounded-sm gap-1"
                            onClick={() => setLinkedinUnifiedDialogOpen(true)}
                          >
                            <span className="size-3 rounded-full bg-[#0A66C2]" />
                            Connect Session
                          </Button>
                        )}
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
                    <LinkSimple className="size-8 text-muted-foreground" weight="light" />
                    <p className="text-sm text-muted-foreground">
                      No accounts connected yet. Connect a social account to manage integrations.
                    </p>
                  </div>
                )}

                {/* Quick-connect CTAs */}
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground mb-3">
                    Connect more platforms
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <PlatformConnectButton platform="instagram" label="Instagram" />
                    <PlatformConnectButton platform="facebook" label="Facebook" />
                    <PlatformConnectButton platform="x" label="X (Twitter)" />
                    <PlatformConnectButton 
                      platform="linkedin" 
                      label="LinkedIn" 
                      onLinkedinConnect={() => setLinkedinUnifiedDialogOpen(true)}
                    />
                    <PlatformConnectButton platform="tiktok" label="TikTok" />
                    <PlatformConnectButton platform="pinterest" label="Pinterest" />
                    <PlatformConnectButton platform="threads" label="Threads" />
                    <PlatformConnectButton platform="googleBusiness" label="Google Business" />
                    <PlatformConnectButton platform="youtube" label="YouTube" />
                    <PlatformConnectButton platform="bluesky" label="Bluesky" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
          <TabsContent value="developer" className="space-y-4">
            <DeveloperAppsTabContent />
          </TabsContent>
          )}

          <TabsContent value="ai" className="space-y-4">
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                  <ShieldCheck className="size-5 text-brand" weight="fill" />
                  AI Guardrails
                </CardTitle>
                <CardDescription>
                  Configure AI autonomy levels, safety filters, and disclosure settings for content generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <VisibilityToggles />
                <Separator />
                <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
                  <ShieldCheck className="size-8 text-muted-foreground" weight="light" />
                  <p className="text-sm text-muted-foreground">
                    Additional guardrails configuration coming soon. Default safety settings are active.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-0">
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 tracking-tight">
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

          <TabsContent value="notifications" className="space-y-0">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-0">
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                  <AddressBook className="size-5 text-brand" weight="fill" />
                  Contacts
                </CardTitle>
                <CardDescription>
                  Manage your saved contacts for mention autocomplete in posts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end">
                <Card className="group flex items-center justify-between rounded-sm border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => router.push('/settings/contacts')}
                >
                  <span className="text-sm text-foreground tracking-tight">Manage contacts</span>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-0">
            <McpTab />
          </TabsContent>

          <TabsContent value="signatures" className="space-y-0">
            <SignatureTab />
          </TabsContent>
        </>
      )}
      {disconnectingPlatform && (
        <DisconnectDialog
          open={disconnectingPlatform != null}
          platform={disconnectingPlatform}
          accountId=""
          onClose={() => setDisconnectingPlatform(null)}
          onDisconnectSuccess={handleDisconnectSuccess}
        />
      )}
      <LinkedInUnifiedDialog
        open={linkedinUnifiedDialogOpen}
        onOpenChange={setLinkedinUnifiedDialogOpen}
        onComplete={handleLinkedinComplete}
        hasOAuthConnected={linkedinHasOAuth}
      />
    </Tabs>
  );
}

function VisibilityToggles() {
  const { config, updateConfig } = useInvisibleAI();

  const toggleItems = [
    {
      key: "showAILabels" as const,
      title: "Show AI labels on drafts",
      description: "Display 'AI-generated' badges on content drafts",
      icon: <ChatCircleText className="size-4 text-muted-foreground" />,
    },
    {
      key: "showConfidence" as const,
      title: "Show confidence signals",
      description: "Display confidence level badges (High/Medium/Low) on posts",
      icon: <Sparkle className="size-4 text-muted-foreground" />,
    },
    {
      key: "showAgentStatus" as const,
      title: "Show agent status indicator",
      description: "Display 'Agent working...' text in the top bar",
      icon: <Eye className="size-4 text-muted-foreground" />,
    },
    {
      key: "showAIInsightsBadge" as const,
      title: "Show AI Insights badge",
      description: "Display 'AI Insights' labels on analytics cards",
      icon: <ChatCircleText className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium tracking-tight">AI Visibility</h4>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Control how AI features appear in your interface. By default, AI runs invisibly.
        </p>
      </div>

      <div className="space-y-3">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 rounded-sm border p-3">
            <div className="flex items-start gap-3">
              {item.icon}
              <div>
                <p className="text-sm font-medium tracking-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <Switch
              checked={config[item.key]}
              onCheckedChange={(checked) => updateConfig({ [item.key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
