"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, EnvelopeSimple, DeviceMobile, Sparkle } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

type DigestFrequency = "NEVER" | "DAILY" | "WEEKLY";

interface CategoryPreference {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

interface Preferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<string, CategoryPreference>;
  digestFrequency: DigestFrequency;
}

const DEFAULT_CATEGORIES: Record<string, CategoryPreference> = {
  post_publish: { in_app: true, email: true, push: false },
  engagement: { in_app: true, email: false, push: false },
  system: { in_app: true, email: true, push: false },
  billing: { in_app: true, email: true, push: true },
  ai_insight: { in_app: true, email: false, push: false },
  connection: { in_app: true, email: false, push: false },
  brand: { in_app: true, email: false, push: false },
};

const CATEGORY_LABELS: Record<string, string> = {
  post_publish: "Post Publish",
  engagement: "Engagement",
  system: "System",
  billing: "Billing",
  ai_insight: "AI Insights",
  connection: "Connections",
  brand: "Brand",
};

const CATEGORY_ORDER = [
  "post_publish",
  "engagement",
  "system",
  "billing",
  "ai_insight",
  "connection",
  "brand",
];

const DEFAULT_PREFERENCES: Preferences = {
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: false,
  categories: DEFAULT_CATEGORIES,
  digestFrequency: "WEEKLY",
};

async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch("/api/notifications/preferences");
  if (!res.ok) {
    throw new Error("Failed to load preferences");
  }
  const data = (await res.json()) as {
    preferences: {
      inAppEnabled: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
      categories: Record<string, CategoryPreference> | string;
      digestFrequency: DigestFrequency;
    };
  };
  const prefs = data.preferences;
  const categories =
    typeof prefs.categories === "string"
      ? (JSON.parse(prefs.categories) as Record<string, CategoryPreference>)
      : prefs.categories ?? DEFAULT_CATEGORIES;

  const normalizedCategories = { ...DEFAULT_CATEGORIES };
  for (const key of CATEGORY_ORDER) {
    if (categories[key]) {
      normalizedCategories[key] = {
        in_app: Boolean(categories[key].in_app),
        email: Boolean(categories[key].email),
        push: Boolean(categories[key].push),
      };
    }
  }

  return {
    inAppEnabled: Boolean(prefs.inAppEnabled),
    emailEnabled: Boolean(prefs.emailEnabled),
    pushEnabled: Boolean(prefs.pushEnabled),
    categories: normalizedCategories,
    digestFrequency: prefs.digestFrequency ?? "WEEKLY",
  };
}

export function NotificationsTab() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPreferences()
      .then((prefs) => {
        if (!cancelled) setPreferences(prefs);
      })
      .catch(() => {
        if (!cancelled) {
          setPreferences(DEFAULT_PREFERENCES);
          toast.error("Could not load notification preferences");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistPreferences = useCallback((next: Preferences) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch("/api/notifications/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inAppEnabled: next.inAppEnabled,
              emailEnabled: next.emailEnabled,
              pushEnabled: next.pushEnabled,
              categories: next.categories,
              digestFrequency: next.digestFrequency,
            }),
          });
          if (!res.ok) throw new Error("save failed");
          toast.success("Notification preferences saved");
        } catch {
          toast.error("Failed to save preferences");
        }
      });
    }, 250);
  }, []);

  const update = useCallback(
    (updater: (prev: Preferences) => Preferences) => {
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        persistPreferences(next);
        return next;
      });
    },
    [persistPreferences],
  );

  const toggleChannel = useCallback(
    (channel: "inAppEnabled" | "emailEnabled" | "pushEnabled") => {
      update((prev) => ({ ...prev, [channel]: !prev[channel] }));
    },
    [update],
  );

  const toggleCategoryChannel = useCallback(
    (category: string, channel: keyof CategoryPreference) => {
      update((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: {
            ...prev.categories[category],
            [channel]: !prev.categories[category][channel],
          },
        },
      }));
    },
    [update],
  );

  const setDigestFrequency = useCallback(
    (value: string) => {
      update((prev) => ({
        ...prev,
        digestFrequency: value as DigestFrequency,
      }));
    },
    [update],
  );

  const categoryRows = useMemo(
    () =>
      CATEGORY_ORDER.map((key) => ({
        key,
        label: CATEGORY_LABELS[key] ?? key,
        preference: preferences?.categories[key] ?? DEFAULT_CATEGORIES[key],
      })),
    [preferences],
  );

  if (loading || !preferences) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Bell className="size-5 text-brand" weight="fill" />
            Channel Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications across channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChannelRow
            icon={<Bell className="size-4 text-muted-foreground" weight="fill" />}
            title="In-app notifications"
            description="See notifications inside the dashboard and notification bell."
            checked={preferences.inAppEnabled}
            disabled={isPending}
            onToggle={() => toggleChannel("inAppEnabled")}
          />
          <ChannelRow
            icon={<EnvelopeSimple className="size-4 text-muted-foreground" weight="fill" />}
            title="Email notifications"
            description="Receive digests and important alerts in your inbox."
            checked={preferences.emailEnabled}
            disabled={isPending}
            onToggle={() => toggleChannel("emailEnabled")}
          />
          <ChannelRow
            icon={<DeviceMobile className="size-4 text-muted-foreground" weight="fill" />}
            title="Browser push notifications"
            description="Get real-time browser alerts. Requires granting permission in your browser."
            checked={preferences.pushEnabled}
            disabled={isPending}
            onToggle={() => toggleChannel("pushEnabled")}
            note={
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission !== "granted"
                ? "You'll be asked to allow browser notifications when enabled."
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Category Preferences
          </CardTitle>
          <CardDescription>
            Fine-tune which notification types are delivered on each channel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Category</TableHead>
                  <TableHead className="text-center">In-App</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">Push</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-foreground">
                      {row.label}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.preference.in_app}
                        disabled={isPending}
                        onCheckedChange={() =>
                          toggleCategoryChannel(row.key, "in_app")
                        }
                        aria-label={`${row.label} in-app`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.preference.email}
                        disabled={isPending}
                        onCheckedChange={() =>
                          toggleCategoryChannel(row.key, "email")
                        }
                        aria-label={`${row.label} email`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.preference.push}
                        disabled={isPending}
                        onCheckedChange={() =>
                          toggleCategoryChannel(row.key, "push")
                        }
                        aria-label={`${row.label} push`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <EnvelopeSimple className="size-5 text-brand" weight="fill" />
            Digest Settings
          </CardTitle>
          <CardDescription>
            Choose how often you receive a summary email of your notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.digestFrequency}
            onValueChange={setDigestFrequency}
            disabled={isPending}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
          >
            {[
              { value: "NEVER", label: "Never" },
              { value: "DAILY", label: "Daily" },
              { value: "WEEKLY", label: "Weekly" },
            ].map((option) => (
              <Label
                key={option.value}
                htmlFor={`digest-${option.value}`}
                className="flex items-center gap-2 font-normal cursor-pointer"
              >
                <RadioGroupItem
                  id={`digest-${option.value}`}
                  value={option.value}
                />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onToggle,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-sm border border-border p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div className="space-y-1">
          <p className="text-sm font-medium tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {note && (
            <p className="text-xs text-muted-foreground italic">{note}</p>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
}
