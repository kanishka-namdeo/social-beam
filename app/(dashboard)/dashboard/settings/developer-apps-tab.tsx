'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, GearSix, Code } from '@phosphor-icons/react';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';
import { OauthAppConfigDialog } from './components/oauth-app-config-dialog';

interface PlatformConfigStatus {
  platform: string;
  isConfigured: boolean;
  hasClientId: boolean;
  hasSecret: boolean;
}

interface DeveloperAppsTabProps {
  initialApps: PlatformConfigStatus[];
}

export function DeveloperAppsTab({ initialApps }: DeveloperAppsTabProps) {
  const [apps, setApps] = useState(initialApps);
  const [configuringPlatform, setConfiguringPlatform] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const handleConfigured = (platform: string, saved: boolean) => {
    setApps((prev) =>
      prev.map((a) =>
        a.platform === platform
          ? { ...a, isConfigured: saved, hasClientId: saved, hasSecret: saved }
          : a,
      ),
    );
    setConfiguringPlatform(null);
    if (saved) {
      setJustSaved(platform);
      setTimeout(() => setJustSaved(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {justSaved && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success flex items-center gap-2">
          <CheckCircle className="size-4" weight="fill" />
          Credentials for {PLATFORM_DISPLAY_NAMES[justSaved]} saved successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Developer App Credentials</CardTitle>
          <CardDescription>
            Each social platform requires a developer app with OAuth credentials. Create your apps on the respective
            developer portals and paste the Client ID and Client Secret below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!apps.some((a) => a.isConfigured) && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <Code className="size-8 text-muted-foreground" weight="light" />
              <p className="text-sm font-medium text-foreground">No developer apps configured yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Connect third-party services to enhance your social media management. You&apos;ll need to create OAuth apps on each platform.
              </p>
              <Button variant="outline" size="sm" onClick={() => apps[0] && setConfiguringPlatform(apps[0].platform)}>
                Configure your first app
              </Button>
            </div>
          )}
          {apps.map((app) => {
            const displayName = PLATFORM_DISPLAY_NAMES[app.platform] ?? app.platform;

            return (
              <div
                key={app.platform}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                  {platformIcon(app.platform)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    {app.isConfigured ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="size-3 text-success" weight="fill" />
                        Configured
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <XCircle className="size-3" weight="fill" />
                        Not configured
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.isConfigured && (
                    <Badge variant="default" className="text-[0.625rem] normal-case tracking-normal bg-success/20 text-success border-success/30">
                      Active
                    </Badge>
                  )}
                  <Button
                    variant={app.isConfigured ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => setConfiguringPlatform(app.platform)}
                  >
                    {app.isConfigured ? (
                      <>
                        <GearSix className="mr-1 size-3" />
                        Edit
                      </>
                    ) : (
                      'Configure'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {configuringPlatform && (
        <OauthAppConfigDialog
          open={configuringPlatform != null}
          platform={configuringPlatform}
          isConfigured={apps.find((a) => a.platform === configuringPlatform)?.isConfigured ?? false}
          onClose={() => setConfiguringPlatform(null)}
          onSaved={(saved) => handleConfigured(configuringPlatform, saved)}
        />
      )}
    </div>
  );
}
