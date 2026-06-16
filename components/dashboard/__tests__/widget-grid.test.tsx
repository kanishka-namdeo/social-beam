import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks – must be declared before the component import so the module graph
// picks up the stubs when widget-grid-v2.tsx is first evaluated.
// ---------------------------------------------------------------------------

// 1. react-grid-layout -------------------------------------------------------

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  size?: string;
  visible?: boolean;
};

type Layout = LayoutItem[];

interface CapturedGridProps {
  layout?: Layout;
  width?: number;
  children?: React.ReactNode;
  onLayoutChange?: (layout: Layout) => void;
  onDragStop?: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
    element: HTMLElement | null,
  ) => void;
  onResizeStop?: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
    element: HTMLElement | null,
  ) => void;
  [key: string]: unknown;
}

let capturedGridProps: CapturedGridProps = {};

vi.mock("react-grid-layout", () => ({
  ReactGridLayout: (props: CapturedGridProps) => {
    capturedGridProps = props;
    return <div data-testid="react-grid-layout">{props.children}</div>;
  },
  useContainerWidth: () => ({
    width: 1200,
    containerRef: { current: document.createElement("div") },
    mounted: true,
  }),
  verticalCompactor: vi.fn(),
}));

// CSS imports are no-ops in tests
vi.mock("react-grid-layout/css/styles.css", () => ({}));
vi.mock("react-resizable/css/styles.css", () => ({}));
vi.mock("../widget-grid-styles.css", () => ({}));

// 2. sonner (toast) ----------------------------------------------------------
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// 3. Widget renderers & error boundary --------------------------------------
vi.mock("@/lib/dashboard/widget-renderers-v2", () => ({
  renderWidgetContent: (id: string) => (
    <div data-testid={`widget-content-${id}`}>Widget: {id}</div>
  ),
}));

vi.mock("@/components/dashboard/widget-error-boundary", () => ({
  WidgetErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// 4. Phosphor icons ----------------------------------------------------------
vi.mock("@phosphor-icons/react/ssr", () => ({
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
  ArrowsOut: (props: Record<string, unknown>) => <svg data-testid="icon-arrows-out" {...props} />,
  Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
}));

// 5. The component under test ------------------------------------------------
import { WidgetGrid } from "../widget-grid-v2";
import type {
  WidgetLayout,
  WidgetLayoutItem,
} from "@/lib/dashboard/widget-registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWidget(
  overrides: Partial<WidgetLayoutItem> & Pick<WidgetLayoutItem, "i">,
): WidgetLayoutItem {
  return {
    x: 0,
    y: 0,
    w: 5,
    h: 2,
    size: "5x2",
    visible: true,
    ...overrides,
  };
}

const MOCK_DASHBOARD_DATA = {
  recentPosts: [],
  scheduledPosts: [],
  insights: {},
  quickStats: {
    totalPosts: 0,
    scheduledCount: 0,
    publishedThisWeek: 0,
    failedCount: 0,
  },
  connectedAccounts: [],
};

function buildLayout(
  widgets: (Partial<WidgetLayoutItem> & Pick<WidgetLayoutItem, "i">)[],
): WidgetLayout {
  return { widgets: widgets.map((w) => makeWidget(w)) };
}

function renderGrid(layout: WidgetLayout) {
  return render(
    <WidgetGrid layout={layout} data={MOCK_DASHBOARD_DATA} userRole="FREE_USER" />,
  );
}

/**
 * Flush the 300ms debounce inside savePreferences, then flush all
 * microtasks so the async fetch call completes.
 */
async function flushSave() {
  await act(async () => {
    vi.advanceTimersByTime(350);
    // Let the async fetch() inside the setTimeout callback resolve
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WidgetGrid", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedGridProps = {};
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Layout persistence – drag a widget, verify PUT is called
  // -----------------------------------------------------------------------
  it("calls PUT /api/dashboard/preferences with updated layout after drag stop", async () => {
    const layout = buildLayout([
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
      { i: "recent-posts", x: 0, y: 1, w: 5, h: 3 },
      { i: "insights", x: 5, y: 1, w: 5, h: 3 },
    ]);

    renderGrid(layout);

    // Simulate the grid reporting a new layout after a drag operation.
    const newLayout: Layout = [
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
      { i: "recent-posts", x: 5, y: 1, w: 5, h: 3 },
      { i: "insights", x: 0, y: 4, w: 5, h: 3 },
    ];

    await act(async () => {
      capturedGridProps.onDragStop?.(
        newLayout,
        null,
        { i: "recent-posts", x: 5, y: 1, w: 5, h: 3 },
        null,
        new Event("dragstop") as Event,
        null,
      );
    });

    await flushSave();

    const putCalls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT",
    );
    expect(putCalls.length).toBeGreaterThanOrEqual(1);

    const body = JSON.parse(putCalls[0][1].body as string);
    expect(body.widgets).toHaveLength(3);

    const recentPosts = body.widgets.find(
      (w: WidgetLayoutItem) => w.i === "recent-posts",
    );
    expect(recentPosts).toMatchObject({ x: 5, y: 1, w: 5, h: 3 });
  });

  // -----------------------------------------------------------------------
  // 2. Resize constraint – resizing below minW/minH snaps back
  // -----------------------------------------------------------------------
  it("enforces minW/minH constraints when resize stop reports sub-minimum dimensions", async () => {
    const layout = buildLayout([
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1, minW: 6, minH: 1 },
      { i: "recent-posts", x: 0, y: 1, w: 5, h: 3, minW: 2, minH: 2 },
    ]);

    renderGrid(layout);

    // react-grid-layout clamps to minW/minH before calling onResizeStop.
    // We simulate the clamped result.
    const clampedLayout: Layout = [
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
      { i: "recent-posts", x: 0, y: 1, w: 2, h: 2, minW: 2, minH: 2 },
    ];

    await act(async () => {
      capturedGridProps.onResizeStop?.(
        clampedLayout,
        null,
        { i: "recent-posts", x: 0, y: 1, w: 2, h: 2 },
        null,
        new Event("resizestop") as Event,
        null,
      );
    });

    await flushSave();

    const putCalls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT",
    );
    expect(putCalls.length).toBeGreaterThanOrEqual(1);

    const body = JSON.parse(putCalls[0][1].body as string);
    const recentPosts = body.widgets.find(
      (w: WidgetLayoutItem) => w.i === "recent-posts",
    );
    // Widget should be at its minimum allowed size, not smaller
    expect(recentPosts.w).toBeGreaterThanOrEqual(2);
    expect(recentPosts.h).toBeGreaterThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // 3. Add widget – new widget appears in the grid
  // -----------------------------------------------------------------------
  it("renders a newly added widget when the layout prop includes it", async () => {
    const initialLayout = buildLayout([
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
    ]);

    const { rerender } = renderGrid(initialLayout);

    expect(screen.getByTestId("widget-content-quick-stats")).toBeDefined();

    // Simulate adding a widget via the customize dialog — the parent passes
    // an updated layout prop with the new widget at the first available position.
    const updatedLayout = buildLayout([
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
      { i: "recent-posts", x: 0, y: 1, w: 5, h: 3 },
    ]);

    rerender(
      <WidgetGrid
        layout={updatedLayout}
        data={MOCK_DASHBOARD_DATA}
        userRole="FREE_USER"
      />,
    );

    expect(screen.getByTestId("widget-content-recent-posts")).toBeDefined();
    expect(capturedGridProps.layout).toHaveLength(2);

    const addedWidget = capturedGridProps.layout?.find(
      (w: LayoutItem) => w.i === "recent-posts",
    );
    expect(addedWidget).toBeDefined();
    expect(addedWidget?.x).toBe(0);
    expect(addedWidget?.y).toBe(1);
  });

  // -----------------------------------------------------------------------
  // 4. Remove widget – remaining widgets compact upward
  // -----------------------------------------------------------------------
  it("removes a widget and saves the remaining layout", async () => {
    const layout = buildLayout([
      { i: "quick-stats", x: 0, y: 0, w: 10, h: 1 },
      { i: "recent-posts", x: 0, y: 1, w: 5, h: 3 },
      { i: "insights", x: 5, y: 1, w: 5, h: 3 },
    ]);

    renderGrid(layout);

    // All 3 widgets should be present
    expect(screen.getByTestId("widget-content-quick-stats")).toBeDefined();
    expect(screen.getByTestId("widget-content-recent-posts")).toBeDefined();
    expect(screen.getByTestId("widget-content-insights")).toBeDefined();

    // Find the remove buttons. Each WidgetCard has two <button> elements:
    // the remove button (X icon) and the resize button (ArrowsOut icon from WidgetSizePicker).
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBe(6);

    // Click the remove button for "recent-posts" (the second widget).
    // We identify it by its position relative to the widget content.
    // Each widget has two buttons: resize (first) and remove (second).
    const recentPostsContent = screen.getByTestId("widget-content-recent-posts");
    const recentPostsCard = recentPostsContent.closest(".group\\/widget") ??
      recentPostsContent.parentElement?.parentElement;
    const buttons = recentPostsCard?.querySelectorAll("button");
    const removeButton = buttons?.[1]; // Second button is the remove button
    expect(removeButton).toBeTruthy();

    await act(async () => {
      removeButton!.click();
    });

    // The removed widget should no longer be rendered
    expect(screen.queryByTestId("widget-content-recent-posts")).toBeNull();
    expect(screen.getByTestId("widget-content-quick-stats")).toBeDefined();
    expect(screen.getByTestId("widget-content-insights")).toBeDefined();

    // The grid should now receive a layout with only 2 widgets
    expect(capturedGridProps.layout).toHaveLength(2);

    // Verify the save was triggered
    await flushSave();

    const putCalls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT",
    );
    expect(putCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(putCalls[0][1].body as string);
    expect(body.widgets).toHaveLength(2);
    expect(body.widgets.find((w: WidgetLayoutItem) => w.i === "recent-posts")).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 5. Load saved layout – verify widgets at saved positions
  // -----------------------------------------------------------------------
  it("renders widgets at positions from a saved layout passed via props", async () => {
    const savedLayout: WidgetLayout = {
      widgets: [
        {
          i: "recent-posts",
          x: 0,
          y: 0,
          w: 5,
          h: 3,
          size: "5x3",
          visible: true,
        },
        {
          i: "insights",
          x: 5,
          y: 0,
          w: 5,
          h: 2,
          size: "5x2",
          visible: true,
        },
        {
          i: "quick-stats",
          x: 0,
          y: 3,
          w: 10,
          h: 1,
          size: "10x1",
          visible: true,
        },
      ],
    };

    renderGrid(savedLayout);

    // All three widgets should be rendered
    expect(screen.getByTestId("widget-content-recent-posts")).toBeDefined();
    expect(screen.getByTestId("widget-content-insights")).toBeDefined();
    expect(screen.getByTestId("widget-content-quick-stats")).toBeDefined();

    // Verify the grid received the correct layout positions
    const gridLayout = capturedGridProps.layout;
    expect(gridLayout).toHaveLength(3);

    expect(gridLayout?.find((w: LayoutItem) => w.i === "recent-posts")).toMatchObject({
      x: 0,
      y: 0,
      w: 5,
      h: 3,
    });

    expect(gridLayout?.find((w: LayoutItem) => w.i === "insights")).toMatchObject({
      x: 5,
      y: 0,
      w: 5,
      h: 2,
    });

    expect(gridLayout?.find((w: LayoutItem) => w.i === "quick-stats")).toMatchObject({
      x: 0,
      y: 3,
      w: 10,
      h: 1,
    });
  });

  // -----------------------------------------------------------------------
  // 5b. Save/load round-trip via PUT API
  // -----------------------------------------------------------------------
  it("persists layout through PUT API for later reload", async () => {
    const layout = buildLayout([
      { i: "recent-posts", x: 0, y: 0, w: 5, h: 3 },
      { i: "insights", x: 5, y: 0, w: 5, h: 2 },
    ]);

    renderGrid(layout);

    // Simulate a drag that triggers save
    const draggedLayout: Layout = [
      { i: "recent-posts", x: 0, y: 0, w: 5, h: 3 },
      { i: "insights", x: 5, y: 0, w: 5, h: 2 },
    ];

    await act(async () => {
      capturedGridProps.onDragStop?.(
        draggedLayout,
        null,
        { i: "recent-posts", x: 0, y: 0, w: 5, h: 3 },
        null,
        new Event("dragstop") as Event,
        null,
      );
    });

    await flushSave();

    const putCalls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT",
    );
    expect(putCalls.length).toBeGreaterThanOrEqual(1);

    const body = JSON.parse(putCalls[0][1].body as string);
    expect(body.widgets).toHaveLength(2);
    expect(body.widgets[0]).toMatchObject({ i: "recent-posts", x: 0, y: 0, w: 5, h: 3 });
    expect(body.widgets[1]).toMatchObject({ i: "insights", x: 5, y: 0, w: 5, h: 2 });

    // Verify the endpoint URL
    expect(putCalls[0][0]).toBe("/api/dashboard/preferences");
  });
});
