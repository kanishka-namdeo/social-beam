"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MagnifyingGlass,
  House,
  PencilLine,
  CalendarBlank,
  ChartBar,
  RedditLogo,
  ImageSquare,
  Gear,
  Bell,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  SignOut,
  Sparkle,
  CreditCard,
  Users,
} from "@phosphor-icons/react/ssr";
import { useTheme } from "@wrksz/themes/client";

type PhosphorIcon = typeof House;

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: PhosphorIcon;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Go to Dashboard",
        description: "Overview and widgets",
        icon: House,
        action: () => navigate("/dashboard"),
        keywords: ["home", "overview", "widgets"],
        group: "Navigation",
      },
      {
        id: "compose",
        label: "Compose Post",
        description: "Create a new post",
        icon: PencilLine,
        action: () => navigate("/compose"),
        keywords: ["new", "write", "create", "post"],
        group: "Navigation",
      },
      {
        id: "calendar",
        label: "Calendar",
        description: "Scheduled posts",
        icon: CalendarBlank,
        action: () => navigate("/calendar"),
        keywords: ["schedule", "posts", "planning"],
        group: "Navigation",
      },
      {
        id: "analytics",
        label: "Analytics",
        description: "View performance metrics",
        icon: ChartBar,
        action: () => navigate("/analytics"),
        keywords: ["metrics", "stats", "performance"],
        group: "Navigation",
      },
      {
        id: "reddit",
        label: "Reddit Trending",
        description: "Discover trending topics",
        icon: RedditLogo,
        action: () => navigate("/reddit/trending"),
        keywords: ["trending", "discover", "subreddit"],
        group: "Navigation",
      },
      {
        id: "media",
        label: "Media Library",
        description: "Manage images and assets",
        icon: ImageSquare,
        action: () => navigate("/media"),
        keywords: ["images", "assets", "files", "upload"],
        group: "Navigation",
      },
      {
        id: "settings",
        label: "Settings",
        description: "App preferences",
        icon: Gear,
        action: () => navigate("/settings"),
        keywords: ["preferences", "config", "options"],
        group: "Navigation",
      },
      {
        id: "notifications",
        label: "Notifications",
        description: "View all notifications",
        icon: Bell,
        action: () => navigate("/notifications"),
        keywords: ["alerts", "messages"],
        group: "Navigation",
      },
      {
        id: "activity",
        label: "Activity Log",
        description: "View recent activity",
        icon: Clock,
        action: () => navigate("/activity"),
        keywords: ["history", "logs", "recent"],
        group: "Navigation",
      },
      {
        id: "billing",
        label: "Billing",
        description: "Manage subscription",
        icon: CreditCard,
        action: () => navigate("/billing"),
        keywords: ["payment", "subscription", "plan"],
        group: "Navigation",
      },
      {
        id: "team",
        label: "Team",
        description: "Manage team members",
        icon: Users,
        action: () => navigate("/team"),
        keywords: ["members", "collaborators", "invite"],
        group: "Navigation",
      },
      {
        id: "theme-light",
        label: "Switch to Light Mode",
        description: "Use light theme",
        icon: Sun,
        action: () => {
          setTheme("light");
          setOpen(false);
          setQuery("");
        },
        keywords: ["light", "bright"],
        group: "Appearance",
      },
      {
        id: "theme-dark",
        label: "Switch to Dark Mode",
        description: "Use dark theme",
        icon: Moon,
        action: () => {
          setTheme("dark");
          setOpen(false);
          setQuery("");
        },
        keywords: ["dark", "night"],
        group: "Appearance",
      },
      {
        id: "upgrade",
        label: "Upgrade to Premium",
        description: "Unlock AI features, advanced analytics, and more",
        icon: Sparkle,
        action: () => navigate("/billing"),
        keywords: ["premium", "pro", "plan"],
        group: "Account",
      },
      {
        id: "signout",
        label: "Sign Out",
        description: "End your session",
        icon: SignOut,
        action: () => {
          setOpen(false);
          setQuery("");
          import("next-auth/react").then(({ signOut }) => signOut({ callbackUrl: "/login" }));
        },
        keywords: ["logout", "exit", "leave"],
        group: "Account",
      },
    ],
    [navigate, setTheme],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q)),
    );
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const arr = groups.get(item.group) ?? [];
      arr.push(item);
      groups.set(item.group, arr);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatList.length) % flatList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatList[selectedIndex];
      if (item) item.action();
    }
  };

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      {open && (
        <>
          <DialogOverlay className="bg-black/40" />
          <div
            className="fixed top-[15%] left-1/2 z-[var(--z-dialog)] w-full max-w-lg -translate-x-1/2 rounded-none bg-popover p-0 text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-label="Command palette"
          >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <MagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <kbd className="hidden sm:flex h-5 items-center rounded border border-border bg-muted px-1.5 text-micro text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-micro font-medium text-muted-foreground uppercase tracking-wider">
                  {group}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50",
                      )}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate font-medium">{item.label}</span>
                        {item.description && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="size-3.5 text-muted-foreground/50 shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <div className="flex items-center gap-3 text-micro text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5">esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
