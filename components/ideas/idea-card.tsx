"use client";

import { Sparkle, PencilSimple, Trash, Lightbulb, ArrowRight } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Idea } from "@/app/generated/prisma";

interface IdeaCardProps {
  idea: Idea;
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onConvert: (idea: Idea) => void;
  onPlaceOnCalendar: (idea: Idea) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

const sourceConfig = {
  MANUAL: { label: "Manual", className: "bg-slate-100 text-slate-700 border-slate-200" },
  AI_GENERATED: { label: "AI", className: "bg-brand/10 text-brand border-brand/20" },
  RSS: { label: "RSS", className: "bg-orange-100 text-orange-700 border-orange-200" },
  TRENDING: { label: "Trending", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

const categoryColors: Record<string, string> = {
  Educational: "border-l-blue-500",
  "Behind the Scenes": "border-l-purple-500",
  "Industry News": "border-l-cyan-500",
  "Tips & Tricks": "border-l-green-500",
  "Case Study": "border-l-amber-500",
  "Thought Leadership": "border-l-rose-500",
  "User Generated Content": "border-l-emerald-500",
  "Product Update": "border-l-orange-500",
};

export function IdeaCard({
  idea,
  onEdit,
  onDelete,
  onConvert,
  onPlaceOnCalendar,
  draggable = false,
  onDragStart,
}: IdeaCardProps) {
  const source = sourceConfig[idea.source] || sourceConfig.MANUAL;
  const borderColor = idea.category ? categoryColors[idea.category] || "border-l-border" : "border-l-border";

  return (
    <Card
      className={`group relative p-4 border-l-4 ${borderColor} ${
        draggable ? "cursor-move hover:shadow-md transition-shadow" : ""
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="space-y-3">
        {/* Title */}
        <h4 className="font-semibold text-sm leading-tight line-clamp-2">
          {idea.title}
        </h4>

        {/* Content preview */}
        {idea.content && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {idea.content}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {idea.category && (
            <Badge variant="outline" className="text-xs">
              {idea.category}
            </Badge>
          )}
          <Badge className={`text-xs ${source.className}`}>
            {source.label}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(idea)}
          >
            <PencilSimple className="w-3 h-3 mr-1" />
            Edit
          </Button>
          {idea.status === "NEW" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onPlaceOnCalendar(idea)}
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Place
            </Button>
          )}
          {idea.status !== "CONVERTED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-brand"
              onClick={() => onConvert(idea)}
            >
              <Sparkle className="w-3 h-3 mr-1" weight="fill" />
              Convert
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
            onClick={() => onDelete(idea.id)}
          >
            <Trash className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
