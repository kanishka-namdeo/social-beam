"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle } from "@phosphor-icons/react";

interface StatusTabsProps {
  status: string;
  unreadCount: number;
  onChange: (status: string) => void;
}

export function StatusTabs({ status, unreadCount, onChange }: StatusTabsProps) {
  return (
    <Tabs value={status} onValueChange={onChange}>
      <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-4">
        <TabsTrigger
          value="all"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-0 py-2 text-sm font-medium transition-colors"
        >
          All
        </TabsTrigger>
        <TabsTrigger
          value="UNREAD"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-0 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          Unread
          {unreadCount > 0 && (
            <Badge variant="outline" className="rounded-sm text-xs px-1.5 min-w-5 h-4 flex items-center justify-center text-brand border-brand/50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="REPLIED"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-0 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <CheckCircle className="size-3.5" weight="bold" />
          Replied
        </TabsTrigger>
        <TabsTrigger
          value="DISMISSED"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-0 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <XCircle className="size-3.5" weight="bold" />
          Dismissed
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
