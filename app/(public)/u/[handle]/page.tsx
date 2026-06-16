import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { platformIcon } from "@/lib/oauth/platform-icons";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/oauth/platform-registry";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkle, ArrowSquareOut } from "@phosphor-icons/react/ssr";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

const PLATFORM_PROFILE_URLS: Partial<Record<string, (username: string) => string>> = {
  linkedin: (u) => `https://linkedin.com/in/${u}`,
  x: (u) => `https://x.com/${u}`,
  instagram: (u) => `https://instagram.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  pinterest: (u) => `https://pinterest.com/${u}`,
  threads: (u) => `https://threads.net/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  bluesky: (u) => `https://bsky.app/profile/${u}`,
};

async function getProfile(handle: string) {
  return prisma.workspace.findUnique({
    where: { publicHandle: handle },
    select: {
      name: true,
      ConnectedAccount: {
        where: { status: "connected" },
        select: {
          platform: true,
          platformUsername: true,
        },
        orderBy: { platform: "asc" },
      },
    },
  });
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const workspace = await getProfile(handle);

  if (!workspace) {
    return { title: "Profile Not Found" };
  }

  return {
    title: `${workspace.name} on SocialBeam`,
    description: `View ${workspace.name}'s connected social media profiles, powered by SocialBeam.`,
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const workspace = await getProfile(handle);

  if (!workspace) {
    notFound();
  }

  const accounts = workspace.ConnectedAccount;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-brand/10">
          <Sparkle weight="fill" className="size-8 text-brand" aria-hidden="true" />
        </div>
        <h1 className="text-display font-bold tracking-tight">
          {workspace.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Connected social profiles
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No social accounts connected yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Social Profiles</CardTitle>
            <CardDescription>
              {accounts.length} connected {accounts.length === 1 ? "account" : "accounts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/50">
              {accounts.map((account) => {
                const displayName =
                  PLATFORM_DISPLAY_NAMES[account.platform] ?? account.platform;
                const urlBuilder = PLATFORM_PROFILE_URLS[account.platform];
                const profileUrl =
                  urlBuilder && account.platformUsername
                    ? urlBuilder(account.platformUsername)
                    : null;
                return (
                  <li key={account.platform} className="py-3 first:pt-0 last:pb-0">
                    {profileUrl ? (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                      >
                        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
                          {platformIcon(account.platform)}
                        </span>
                        <span className="flex-1">
                          <span className="text-sm font-medium">{displayName}</span>
                          {account.platformUsername && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              @{account.platformUsername}
                            </span>
                          )}
                        </span>
                        <ArrowSquareOut
                          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 px-2 py-2">
                        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
                          {platformIcon(account.platform)}
                        </span>
                        <span className="flex-1">
                          <span className="text-sm font-medium">{displayName}</span>
                          {account.platformUsername && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              @{account.platformUsername}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
