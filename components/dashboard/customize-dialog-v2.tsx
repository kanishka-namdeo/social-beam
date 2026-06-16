"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Lock, DotsSixVertical, GearSix, Check, WarningCircle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/use-premium";
import type { UserRole } from "@/lib/role-guard";
import {
  type WidgetLayout,
  type WidgetLayoutEntry,
  getDefaultLayoutForRole,
  WIDGET_REGISTRY,
  getWidgetMeta,
  sizeToGrid,
} from "@/lib/dashboard/widget-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WidgetCategory = "Analytics" | "Content" | "AI" | "Operational" | "Social" | "Admin";

interface WidgetItem {
  id: string;
  visible: boolean;
  size: string;
  category: WidgetCategory;
  minRole: UserRole;
}

// Category display labels are derived from the registry — no hardcoded map needed.

// Role gating is derived from WIDGET_REGISTRY — no hardcoded map needed.

const HARD_MAX = { FREE_USER: 10, PREMIUM_USER: 15, ADMIN: 15 };
const SOFT_MAX = { FREE_USER: 8, PREMIUM_USER: 12, ADMIN: 12 };
const CATEGORY_LIMITS: Partial<Record<WidgetCategory, number>> = {
  Analytics: 5,
  AI: 3,
};

interface CustomizeDialogV2Props {
  layout: WidgetLayout;
  onSave: (layout: WidgetLayout) => void;
  trigger?: React.ReactNode;
}

const CATEGORY_LABELS: Record<string, WidgetCategory> = {
  analytics: "Analytics",
  content: "Content",
  ai: "AI",
  operational: "Operational",
  social: "Social",
  admin: "Admin",
};

function getCategoryForWidget(widgetId: string): WidgetCategory {
  const meta = getWidgetMeta(widgetId);
  if (!meta) return "Operational";
  return CATEGORY_LABELS[meta.category] ?? "Operational";
}

function getMinRoleForWidget(widgetId: string): UserRole {
  return getWidgetMeta(widgetId)?.minRole ?? "FREE_USER";
}

function canUserSeeWidget(widgetId: string, userRole: UserRole): boolean {
  const minRole = getMinRoleForWidget(widgetId);
  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 3,
    PREMIUM_USER: 2,
    FREE_USER: 1,
  };
  return roleHierarchy[userRole] >= roleHierarchy[minRole];
}

function canUserAddWidget(widgetId: string, userRole: UserRole): boolean {
  return canUserSeeWidget(widgetId, userRole);
}

export function CustomizeDialogV2({ layout, onSave, trigger }: CustomizeDialogV2Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WidgetItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetCategory | "all">("all");
  const { isPremium, isAdmin, role } = usePremium();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleCount = items.filter((i) => i.visible).length;
  const hardMax = HARD_MAX[role as UserRole] ?? HARD_MAX.FREE_USER;
  const softMax = SOFT_MAX[role as UserRole] ?? SOFT_MAX.FREE_USER;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (visibleCount > hardMax) {
      errors.push(`You can only have up to ${hardMax} widgets (hard limit)`);
    } else if (visibleCount > softMax) {
      errors.push(`Recommended maximum is ${softMax} widgets for optimal performance`);
    }

    const categoryCounts: Partial<Record<WidgetCategory, number>> = {};
    items.forEach((item) => {
      if (item.visible) {
        const cat = item.category;
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
      }
    });

    Object.entries(CATEGORY_LIMITS).forEach(([cat, limit]) => {
      const count = categoryCounts[cat as WidgetCategory] ?? 0;
      if (count > limit) {
        errors.push(`${cat} widgets: ${count}/${limit} (limit exceeded)`);
      }
    });

    return errors;
  }, [items, visibleCount, hardMax, softMax]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const existingMap = new Map(
        layout.widgets.map((w) => [
          w.i,
          { visible: w.visible ?? true, w: w.w, h: w.h },
        ])
      );

      const initialized: WidgetItem[] = layout.widgets.map((w) => ({
        id: w.i,
        visible: w.visible ?? true,
        size: w.size || "5x2",
        category: getCategoryForWidget(w.i),
        minRole: getMinRoleForWidget(w.i),
      }));

      const existingIds = new Set(layout.widgets.map((w) => w.i));
      for (const widget of WIDGET_REGISTRY) {
        if (!existingIds.has(widget.id)) {
          initialized.push({
            id: widget.id,
            visible: false,
            size: widget.defaultSize,
            category: getCategoryForWidget(widget.id),
            minRole: widget.minRole,
          });
        }
      }

      setItems(initialized);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleToggle = (id: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const canAdd = canUserAddWidget(id, role as UserRole);
        if (!canAdd && !item.visible) {
          toast.error("This widget requires a premium subscription. Unlock AI features and advanced analytics.");
          return item;
        }
        return { ...item, visible: !item.visible };
      })
    );
  };

  const handleReset = () => {
    const defaults = getDefaultLayoutForRole(role as UserRole);
    const resetItems: WidgetItem[] = defaults.widgets.map((w) => ({
      id: w.i,
      visible: w.visible ?? true,
      size: w.size || "5x2",
      category: getCategoryForWidget(w.i),
      minRole: getMinRoleForWidget(w.i),
    }));

    const existingIds = new Set(resetItems.map((i) => i.id));
    for (const widget of WIDGET_REGISTRY) {
      if (!existingIds.has(widget.id)) {
        resetItems.push({
          id: widget.id,
          visible: false,
          size: widget.defaultSize,
          category: getCategoryForWidget(widget.id),
          minRole: widget.minRole,
        });
      }
    }

    setItems(resetItems);
    toast.success("Layout reset to defaults");
  };

  const findNextPosition = (
    existing: WidgetItem[],
    width: number,
    height: number
  ): { x: number; y: number } => {
    const grid: boolean[][] = [];
    const maxY = 50;

    for (let y = 0; y <= maxY + height; y++) {
      grid[y] = [];
      for (let x = 0; x < 10; x++) {
        grid[y][x] = false;
      }
    }

    let yOffset = 0;
    for (const item of existing.filter((i) => i.visible)) {
      const dims = getDimensionsFromSize(item.size);
      for (let y = yOffset; y < yOffset + dims.h; y++) {
        for (let x = 0; x < dims.w; x++) {
          if (y < grid.length && x < 10) {
            grid[y][x] = true;
          }
        }
      }
      yOffset += dims.h;
    }

    for (let y = 0; y <= maxY + height; y++) {
      for (let x = 0; x <= 10 - width; x++) {
        let fits = true;
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            if (grid[y + dy]?.[x + dx]) {
              fits = false;
              break;
            }
          }
          if (!fits) break;
        }
        if (fits) return { x, y };
      }
    }

    return { x: 0, y: yOffset };
  };

  const handleSave = () => {
    if (validationErrors.length > 0 && validationErrors.some((e) => e.includes("hard limit"))) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    const visibleItems = items.filter((i) => i.visible);
    const widgetLayout: WidgetLayout = {
      widgets: visibleItems.map((item) => {
        const dims = getDimensionsFromSize(item.size);
        const pos = findNextPosition(
          visibleItems.slice(0, visibleItems.indexOf(item)),
          dims.w,
          dims.h
        );
        return {
          i: item.id,
          x: pos.x,
          y: pos.y,
          w: dims.w,
          h: dims.h,
          size: item.size,
          visible: item.visible,
        } as WidgetLayoutEntry;
      }),
    };
    onSave(widgetLayout);
    setOpen(false);
    toast.success("Dashboard layout saved");
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => item.category === activeTab);
  }, [items, activeTab]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <GearSix weight="bold" className="mr-2 size-4" />
        Customize
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <GearSix weight="bold" className="mr-2 size-4" />
            Customize
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Toggle widgets on or off, drag to reorder, then save your layout.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WidgetCategory | "all")}>
          <TabsList className="grid grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Analytics">Analytics</TabsTrigger>
            <TabsTrigger value="Content">Content</TabsTrigger>
            <TabsTrigger value="AI">AI</TabsTrigger>
            <TabsTrigger value="Operational">Ops</TabsTrigger>
            <TabsTrigger value="Social">Social</TabsTrigger>
            <TabsTrigger value="Admin">Admin</TabsTrigger>
          </TabsList>

          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <WarningCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {visibleCount} / {softMax} widgets (max: {hardMax})
            </span>
            <span className="text-xs">
              {isAdmin ? "Admin" : isPremium ? "Premium" : "Free"} plan
            </span>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                  {filteredItems.map((item) => (
                    <SortableWidgetItemV2
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      userRole={role as UserRole}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>
        </Tabs>

        <Separator />

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleReset} type="button">
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={validationErrors.some((e) => e.includes("hard limit"))}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableWidgetItemV2({
  item,
  onToggle,
  userRole,
}: {
  item: WidgetItem;
  onToggle: (id: string) => void;
  userRole: UserRole;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const meta = getWidgetMeta(item.id);
  const isLocked = !canUserSeeWidget(item.id, userRole);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3",
        isDragging && "opacity-50",
        isLocked && "opacity-70"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label="Drag to reorder"
        type="button"
      >
        <DotsSixVertical weight="bold" className="size-4" />
      </button>

      <Switch
        checked={item.visible}
        onCheckedChange={() => onToggle(item.id)}
        aria-label={`Toggle ${meta?.name ?? item.id}`}
        disabled={isLocked}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {meta?.name ?? item.id}
          </p>
          {isLocked && (
            <Lock className="size-3 text-muted-foreground" weight="bold" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{meta?.description}</p>
      </div>

    </div>
  );
}

function getDimensionsFromSize(size: string): { w: number; h: number } {
  const grid = sizeToGrid(size);
  return { w: grid.w, h: grid.h };
}

export function CustomizeDialogV2Container({
  layout,
  trigger,
}: {
  layout: WidgetLayout;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();

  const handleSave = async (newLayout: WidgetLayout) => {
    try {
      const res = await fetch("/api/dashboard/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLayout),
      });
      if (!res.ok) {
        toast.error("Failed to save dashboard layout");
        return;
      }
      toast.success("Dashboard layout saved");
      router.refresh();
    } catch {
      toast.error("Failed to save dashboard layout");
    }
  };

  return <CustomizeDialogV2 layout={layout} onSave={handleSave} trigger={trigger} />;
}
