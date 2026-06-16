"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  TiktokLogo,
  PinterestLogo,
  MetaLogo,
  ChatCircleText,
  GoogleLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";

export interface MentionSuggestion {
  id: string;
  label: string;
  platform: string;
  avatarUrl?: string;
  type: "account" | "recent" | "typeahead" | "contact";
  headline?: string;
}

interface MentionSuggestionPopupInnerProps {
  items: MentionSuggestion[];
  selectedIndex: number;
  onSelect: (item: MentionSuggestion) => void;
}

function PlatformIcon({ platform }: { platform: string }) {
  const size = "size-3";
  switch (platform) {
    case "instagram":
      return <InstagramLogo className={size} weight="fill" />;
    case "linkedin":
      return <LinkedinLogo className={size} weight="fill" />;
    case "x":
      return <XLogo className={size} weight="fill" />;
    case "tiktok":
      return <TiktokLogo className={size} weight="fill" />;
    case "pinterest":
      return <PinterestLogo className={size} weight="fill" />;
    case "facebook":
    case "threads":
      return <MetaLogo className={size} weight="fill" />;
    case "googleBusiness":
      return <GoogleLogo className={size} weight="fill" />;
    case "youtube":
      return <YoutubeLogo className={size} weight="fill" />;
    case "bluesky":
      return <ChatCircleText className={size} weight="fill" />;
    default:
      return null;
  }
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
  linkedin: "bg-[#0a66c2]",
  x: "bg-black dark:bg-white",
  tiktok: "bg-black",
  pinterest: "bg-[#e60023]",
  facebook: "bg-[#1877f2]",
  threads: "bg-black",
  googleBusiness: "bg-[#4285f4]",
  youtube: "bg-[#ff0000]",
  bluesky: "bg-[#0085ff]",
};

function MentionSuggestionPopupInner({
  items,
  selectedIndex,
  onSelect,
}: MentionSuggestionPopupInnerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
        No results found
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="max-h-[280px] w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
      role="listbox"
    >
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const fallbackChar = (item.label || item.id).charAt(0).toUpperCase();
        const platformColor =
          PLATFORM_COLORS[item.platform] ?? "bg-muted-foreground";

        return (
          <button
            key={`${item.id}-${item.platform}`}
            data-index={index}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(item)}
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
              isSelected
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent/50"
            }`}
          >
            <div className="relative shrink-0">
              <Avatar className="size-7">
                <AvatarImage src={item.avatarUrl} alt={item.label} />
                <AvatarFallback className="text-xs">
                  {fallbackChar}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full text-white ring-1 ring-popover ${platformColor}`}
              >
                <PlatformIcon platform={item.platform} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {item.label}
              </p>
              <div className="flex items-center gap-1.5">
                {item.headline && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.headline}
                  </p>
                )}
                {item.type === "contact" && (
                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                    contact
                  </span>
                )}
                {item.type === "account" && (
                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                    account
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                @{item.id} · {item.platform}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export interface MentionSuggestionPopupHandle {
  onUpdate: (props: {
    items: MentionSuggestion[];
    clientRect?: (() => DOMRect | null) | null;
  }) => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  onDestroy: () => void;
}

interface CreatePopupOptions {
  onSelect: (item: MentionSuggestion) => void;
}

export function createMentionSuggestionPopup(options: CreatePopupOptions) {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let selectedIndex = 0;
  let currentItems: MentionSuggestion[] = [];

  function updatePosition(clientRect?: (() => DOMRect | null) | null) {
    if (!container || !clientRect) return;

    const rect = clientRect();
    if (!rect) return;

    const virtualEl = {
      getBoundingClientRect() {
        return rect;
      },
    };

    computePosition(virtualEl as HTMLElement, container, {
      placement: "bottom-start",
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      if (container) {
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
      }
    });
  }

  function renderPopup(items: MentionSuggestion[], clientRect?: (() => DOMRect | null) | null) {
    if (!container) {
      container = document.createElement("div");
      container.className = "mention-suggestion-popup";
      container.style.position = "fixed";
      container.style.zIndex = "9999";
      document.body.appendChild(container);
      root = createRoot(container);
    }

    currentItems = items;

    root!.render(
      <MentionSuggestionPopupInner
        items={items}
        selectedIndex={selectedIndex}
        onSelect={options.onSelect}
      />,
    );

    updatePosition(clientRect);
  }

  return {
    onStart: (props: {
      items: MentionSuggestion[];
      clientRect?: (() => DOMRect | null) | null;
    }) => {
      selectedIndex = 0;
      renderPopup(props.items, props.clientRect);
    },

    onUpdate: (props: {
      items: MentionSuggestion[];
      clientRect?: (() => DOMRect | null) | null;
    }) => {
      selectedIndex = 0;
      renderPopup(props.items, props.clientRect);
    },

    onExit: () => {
      if (root) {
        root.unmount();
        root = null;
      }
      if (container) {
        container.remove();
        container = null;
      }
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      const { event } = props;

      if (event.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % currentItems.length;
        renderPopup(currentItems);
        return true;
      }

      if (event.key === "ArrowUp") {
        selectedIndex =
          (selectedIndex - 1 + currentItems.length) % currentItems.length;
        renderPopup(currentItems);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const item = currentItems[selectedIndex];
        if (item) {
          options.onSelect(item);
        }
        return true;
      }

      if (event.key === "Escape") {
        return true;
      }

      return false;
    },
  };
}
