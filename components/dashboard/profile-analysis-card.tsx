import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkle } from "@phosphor-icons/react/dist/ssr/Sparkle";

interface ProfileAnalysisCardProps {
  title?: string;
  description?: string;
  profile: {
    tone?: string | null;
    postTypes?: Record<string, unknown> | null;
    audience?: Record<string, unknown> | null;
    bio?: Record<string, unknown> | null;
  };
}

const toneLabels: Record<string, string> = {
  professional: "Professional",
  casual: "Casual",
  witty: "Witty",
  educational: "Educational",
  inspirational: "Inspirational",
  bold: "Bold",
};

export function ProfileAnalysisCard({
  title = "Profile Analysis",
  description = "AI-generated insights from your onboarding session",
  profile,
}: ProfileAnalysisCardProps) {
  const tone = profile.tone ? toneLabels[profile.tone] ?? profile.tone : null;
  const postTypes = profile.postTypes;
  const audience = profile.audience;
  const bio = profile.bio;

  const hasData = tone || (postTypes && Object.keys(postTypes).length > 0) || audience || (bio && bio.industry);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <Sparkle className="size-4 text-brand" weight="fill" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Complete onboarding to see your brand profile analysis.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tone && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Brand Tone
                </p>
                <Badge variant="default" className="text-xs rounded-sm">
                  {tone}
                </Badge>
              </div>
            )}
            {postTypes && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Content Mix
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(postTypes).map(([type, value]) => (
                    <Badge key={type} variant="outline" className="text-xs rounded-sm">
                      {type}: {typeof value === "number" ? `${value}%` : String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {audience && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Audience
                </p>
                <p className="text-sm text-foreground">
                  {Array.isArray(audience.interests)
                    ? audience.interests.slice(0, 3).join(", ")
                    : "Profiled"}
                </p>
              </div>
            )}
            {bio != null && bio.industry != null && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Industry
                </p>
                <p className="text-sm text-foreground">
                  {String(bio.industry)}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
