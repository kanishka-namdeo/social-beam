import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatCircle, GearSix, InstagramLogo, MetaLogo, XLogo, LinkedinLogo, TiktokLogo } from "@phosphor-icons/react";

export function EmptyInboxState() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <ChatCircle className="mx-auto mb-2 size-12 text-muted-foreground" weight="light" />
          <CardTitle className="text-lg">No engagement yet</CardTitle>
          <CardDescription className="mt-2">
            Comments, mentions, and DMs from your connected accounts will appear here.
            Engagement data is available for Instagram, Facebook, X, LinkedIn, and TikTok.
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            <Button asChild variant="outline">
              <a href="/settings">
                <GearSix className="mr-1.5 size-4" />
                Manage accounts
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Worked example preview */}
      <Card className="rounded-sm border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">
            Here&apos;s what you&apos;ll see
          </CardTitle>
          <CardDescription>
            A preview of your inbox once engagement starts coming in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <MockEngagementItem
              platform="instagram"
              author="sarah_designs"
              content="Love this! Can you share more about how you built this feature?"
              time="2m ago"
            />
            <MockEngagementItem
              platform="x"
              author="@techfounder"
              content="Just tried this out - the AI suggestions are spot on"
              time="15m ago"
            />
            <MockEngagementItem
              platform="linkedin"
              author="Alex Chen"
              content="Great insights on social media automation. Would love to connect."
              time="1h ago"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MockEngagementItem({ platform, author, content, time }: {
  platform: string;
  author: string;
  content: string;
  time: string;
}) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: InstagramLogo,
    facebook: MetaLogo,
    x: XLogo,
    linkedin: LinkedinLogo,
    tiktok: TiktokLogo,
  };
  const Icon = iconMap[platform];

  return (
    <div className="flex items-start gap-3 rounded-sm border border-border p-3">
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
        {Icon && <Icon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{author}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{content}</p>
      </div>
    </div>
  );
}
