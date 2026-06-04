"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { DotsSixVertical, GearSix } from "@phosphor-icons/react/ssr";
import {
  type WidgetLayout,
  DEFAULT_WIDGET_LAYOUT,
  WIDGET_REGISTRY,
  getWidgetMeta,
} from "@/lib/dashboard/widget-registry";

interface CustomizeDashboardDialogProps {
  layout: WidgetLayout;
  onSave: (layout: WidgetLayout) => void;
  trigger?: React.ReactNode;
}

interface WidgetItem {
  id: string;
  visible: boolean;
}

export function CustomizeDashboardDialog({
  layout,
  onSave,
  trigger,
}: CustomizeDashboardDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WidgetItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const existingIds = new Set(layout.widgets.map((w) => w.id));
      const existingMap = new Map(layout.widgets.map((w) => [w.id, w.visible]));

      const initialized: WidgetItem[] = layout.widgets.map((w) => ({
        id: w.id,
        visible: w.visible,
      }));

      for (const registryId of Object.keys(WIDGET_REGISTRY)) {
        if (!existingIds.has(registryId)) {
          initialized.push({
            id: registryId,
            visible: existingMap.get(registryId) ?? getWidgetMeta(registryId)?.defaultVisible ?? true,
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
      current.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    );
  };

  const handleReset = () => {
    const defaults = DEFAULT_WIDGET_LAYOUT.widgets;
    const existingIds = new Set(items.map((i) => i.id));
    const updated: WidgetItem[] = defaults.map((w) => ({
      id: w.id,
      visible: w.visible,
    }));

    for (const item of items) {
      if (!existingIds.has(item.id)) {
        const meta = getWidgetMeta(item.id);
        updated.push({
          id: item.id,
          visible: meta?.defaultVisible ?? true,
        });
      }
    }

    setItems(updated);
    toast.success("Layout reset to defaults");
  };

  const handleSave = () => {
    const widgetLayout: WidgetLayout = {
      widgets: items.map((item) => {
        const meta = getWidgetMeta(item.id);
        return {
          id: item.id,
          visible: item.visible,
          colSpan: (meta?.defaultColSpan ?? 2) as 1 | 2 | 4,
        };
      }),
    };
    onSave(widgetLayout);
    setOpen(false);
    toast.success("Dashboard layout saved");
  };

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Toggle widgets on or off, drag to reorder, then save your layout.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {items.map((item) => (
                <SortableWidgetItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Separator />

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleReset} type="button">
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableWidgetItem({
  item,
  onToggle,
}: {
  item: WidgetItem;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const meta = getWidgetMeta(item.id);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-sm border border-border bg-card p-3",
        isDragging && "opacity-50",
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
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{meta?.name ?? item.id}</p>
        <p className="text-xs text-muted-foreground">{meta?.description}</p>
      </div>
    </div>
  );
}

/**
 * Container component that handles saving the layout to the API.
 * Use this from server components — it wraps the dialog with an onSave
 * that automatically calls the preferences API.
 */
export function CustomizeDashboardDialogContainer({
  layout,
  trigger,
}: {
  layout: WidgetLayout;
  trigger?: React.ReactNode;
}) {
  const handleSave = async (newLayout: WidgetLayout) => {
    try {
      await fetch("/api/dashboard/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLayout),
      });
      window.location.reload();
    } catch {
      toast.error("Failed to save dashboard layout");
    }
  };

  return (
    <CustomizeDashboardDialog
      layout={layout}
      onSave={handleSave}
      trigger={trigger}
    />
  );
}
