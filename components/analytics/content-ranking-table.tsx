"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  InstagramLogo,
  MetaLogo,
  XLogo,
  LinkedinLogo,
  TiktokLogo,
  PinterestLogo,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-4" weight="fill" />,
  facebook: <MetaLogo className="size-4" weight="fill" />,
  x: <XLogo className="size-4" weight="fill" />,
  linkedin: <LinkedinLogo className="size-4" weight="fill" />,
  tiktok: <TiktokLogo className="size-4" weight="fill" />,
  pinterest: <PinterestLogo className="size-4" weight="fill" />,
};

interface RankedPost {
  rank: number;
  id: string;
  title: string | null;
  platform: string;
  engagementRate: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string | null;
}

interface ContentRankingTableProps {
  topPosts: RankedPost[];
  bottomPosts: RankedPost[];
}

function engagementRateColor(rate: number) {
  if (rate >= 0.05) return "text-success bg-success/10";
  if (rate >= 0.02) return "text-warning bg-warning/10";
  return "text-destructive bg-destructive/10";
}

function RankingTable({ posts, title }: { posts: RankedPost[]; title: string }) {
  if (posts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-2 px-3 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="py-2 px-3 text-left font-medium text-muted-foreground">Post</th>
              <th className="py-2 px-3 text-left font-medium text-muted-foreground w-24">Platform</th>
              <th className="py-2 px-3 text-right font-medium text-muted-foreground">Eng. Rate</th>
              <th className="py-2 px-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Impressions</th>
              <th className="py-2 px-3 text-right font-medium text-muted-foreground hidden md:table-cell">Likes</th>
              <th className="py-2 px-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Comments</th>
              <th className="py-2 px-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Shares</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, idx) => (
              <tr
                key={`${post.id}-${post.platform}-${idx}`}
                className="border-b border-border/50 hover:bg-muted/50"
              >
                <td className="py-2.5 px-3">
                  <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
                </td>
                <td className="py-2.5 px-3">
                  <Link
                    href={`/compose?post=${post.id}`}
                    className="font-medium text-foreground hover:underline truncate block max-w-[200px]"
                  >
                    {post.title ?? "Untitled"}
                  </Link>
                </td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className="gap-1 text-xs">
                    {platformIcons[post.platform]}
                    <span className="capitalize">{post.platform}</span>
                  </Badge>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Badge className={cn("text-xs", engagementRateColor(post.engagementRate))}>
                    {(post.engagementRate * 100).toFixed(1)}%
                  </Badge>
                </td>
                <td className="py-2.5 px-3 text-right text-foreground hidden sm:table-cell">
                  {post.impressions.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-foreground hidden md:table-cell">
                  {post.likes.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-foreground hidden lg:table-cell">
                  {post.comments.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-foreground hidden lg:table-cell">
                  {post.shares.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ContentRankingTable({ topPosts, bottomPosts }: ContentRankingTableProps) {
  if (topPosts.length === 0 && bottomPosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Rankings</CardTitle>
          <CardDescription>Top and bottom performing posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Published posts will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Content Rankings</CardTitle>
        <CardDescription>Top and bottom performing posts by engagement rate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {topPosts.length > 0 && (
          <RankingTable posts={topPosts} title="Top Performers" />
        )}
        {bottomPosts.length > 0 && (
          <RankingTable posts={bottomPosts} title="Underperforming" />
        )}
      </CardContent>
    </Card>
  );
}
