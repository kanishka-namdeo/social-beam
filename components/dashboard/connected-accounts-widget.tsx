import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlobeHemisphereEast } from "@phosphor-icons/react/ssr";
import { platformIcon } from "@/lib/oauth/platform-icons";

interface ConnectedAccount {
  id: string;
  platform: string;
  platformUserId: string;
  status: string;
}

interface ConnectedAccountsWidgetProps {
  accounts: ConnectedAccount[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  expired: "secondary",
  revoked: "destructive",
  error: "destructive",
};

export function ConnectedAccountsWidget({ accounts }: ConnectedAccountsWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <GlobeHemisphereEast className="size-4 text-brand" weight="bold" />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          Manage your social media integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-empty text-center">
            <GlobeHemisphereEast className="size-8 text-muted-foreground" weight="light" />
            <p className="text-sm text-muted-foreground">
              No accounts connected yet
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/settings?tab=accounts">Connect an Account</a>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-sm border border-border bg-card p-4 hover-lift"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground" aria-hidden="true">
                    {platformIcon(account.platform)}
                  </span>
                  <div>
                    <p className="text-sm font-medium capitalize text-foreground">
                      {account.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.platformUserId}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={statusVariant[account.status] ?? "secondary"}
                  className="text-micro normal-case tracking-normal rounded-sm"
                >
                  {account.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
