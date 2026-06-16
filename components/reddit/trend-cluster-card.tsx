"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  TrendUp,
  ChatText,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

interface TrendClusterPost {
  id: string;
  title: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  url: string;
}

interface TrendCluster {
  id: string;
  topic: string;
  keywords: string[];
  subreddits: string[];
  totalUpvotes: number;
  totalComments: number;
  posts: TrendClusterPost[];
}

interface TrendClusterCardProps {
  cluster: TrendCluster;
  className?: string;
}

export function TrendClusterCard({ cluster, className }: TrendClusterCardProps) {
  return (
    <Card className={cn("border-info/20 bg-info/5", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-info/10">
              <Globe className="size-3.5 text-info" weight="fill" />
            </div>
            <CardTitle className="text-sm font-semibold text-foreground">
              {cluster.topic}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">
            {cluster.subreddits.length} subreddits
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <TrendUp className="size-3 text-success" weight="bold" />
            {cluster.totalUpvotes.toLocaleString()} total upvotes
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <ChatText className="size-3" weight="bold" />
            {cluster.totalComments.toLocaleString()} comments
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {cluster.subreddits.map((sub) => (
            <Badge key={sub} variant="secondary" className="text-xs">
              r/{sub}
            </Badge>
          ))}
        </div>

        {cluster.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cluster.keywords.slice(0, 5).map((kw) => (
              <Badge key={kw} variant="outline" className="text-[10px]">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {cluster.posts.slice(0, 3).map((post) => (
            <div key={post.id} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground shrink-0">r/{post.subreddit}</span>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline truncate flex-1"
              >
                {post.title}
              </a>
              <span className="text-success tabular-nums shrink-0">
                {post.upvotes.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendClusterSectionProps {
  clusters: TrendCluster[];
  className?: string;
}

export function TrendClusterSection({ clusters, className }: TrendClusterSectionProps) {
  if (clusters.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Globe className="size-4 text-info" weight="fill" />
        <h3 className="text-sm font-semibold text-foreground">Cross-Subreddit Trends</h3>
        <Badge variant="secondary" className="text-xs">
          {clusters.length} cluster{clusters.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.map((cluster) => (
          <TrendClusterCard key={cluster.id} cluster={cluster} />
        ))}
      </div>
    </div>
  );
}
