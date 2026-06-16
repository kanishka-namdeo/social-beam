import { toast } from "sonner";

/**
 * Centralized notification utilities for the SocialBeam app.
 * All toasts flow through this module to ensure consistent messaging,
 * iconography, and user feedback patterns.
 *
 * Every toast is automatically bridged to the in-app notification bell
 * so users never miss important events.
 */

// ── Toast coalescing / rate-limiting ────────────────────────────────────

const TOAST_COOLDOWN_MS = 2000;
const recentToasts = new Map<string, number>();
const MAX_RECENT_TOASTS = 100;

function shouldShowToast(id: string | undefined): boolean {
  if (!id) return true;
  const last = recentToasts.get(id);
  if (last && Date.now() - last < TOAST_COOLDOWN_MS) return false;
  recentToasts.set(id, Date.now());
  // Evict oldest entries if map grows too large
  if (recentToasts.size > MAX_RECENT_TOASTS) {
    const cutoff = Date.now() - TOAST_COOLDOWN_MS * 2;
    for (const [key, ts] of recentToasts) {
      if (ts < cutoff) recentToasts.delete(key);
    }
  }
  return true;
}

// ── Notification bell bridge ────────────────────────────────────────────

function pushToBell(type: "info" | "success" | "warning" | "error", title: string, description?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("socialbeam-notification", {
      detail: {
        id: `bell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        description,
        timestamp: new Date(),
        read: false,
        type,
      },
    })
  );
}

// ── Core Notification Functions ─────────────────────────────────────────

export function notifySuccess(title: string, description?: string, opts?: { id?: string }) {
  if (!shouldShowToast(opts?.id)) return;
  toast.success(title, { description });
  pushToBell("success", title, description);
}

export function notifyError(title: string, description?: string, opts?: { id?: string }) {
  if (!shouldShowToast(opts?.id)) return;
  toast.error(title, { description });
  pushToBell("error", title, description);
}

export function notifyWarning(title: string, description?: string, opts?: { id?: string }) {
  if (!shouldShowToast(opts?.id)) return;
  toast.warning(title, { description });
  pushToBell("warning", title, description);
}

export function notifyInfo(title: string, description?: string, opts?: { id?: string }) {
  if (!shouldShowToast(opts?.id)) return;
  toast.info(title, { description });
  pushToBell("info", title, description);
}

// ── Specialized Error Handlers ──────────────────────────────────────────

export function notifyApiError(operation: string, message?: string) {
  notifyError(`Failed to ${operation}`, message ?? "Something went wrong. Please try again.", {
    id: `api-${operation}`,
  });
}

export function notifyAuthError(message?: string) {
  notifyError("Authentication error", message ?? "Please sign in again.", { id: "auth" });
}

export function notifyValidationError(field: string, message: string) {
  notifyError(`Invalid ${field}`, message, { id: `validation-${field}` });
}

// ── Loading Notifications (promise-based) ──────────────────────────────

export function notifyWithLoading<T>(
  promise: Promise<T>,
  opts: { loading: string; success: string; error: string },
) {
  toast.promise(promise, {
    loading: opts.loading,
    success: (data: T) => {
      pushToBell("success", opts.success);
      return opts.success;
    },
    error: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      pushToBell("error", opts.error, msg);
      return opts.error;
    },
  });
}

// ── Toast with undo ─────────────────────────────────────────────────────

export { toastWithUndo, toastSuccessUndo, toastWarning } from "./toast-utils";

// ── Category-aware helpers (toast + server persistence) ────────────────

type NotificationCategory =
  | "post_publish"
  | "engagement"
  | "system"
  | "billing"
  | "ai_insight"
  | "connection"
  | "brand"
  | "custom";

interface CategoryNotifyOptions {
  category: NotificationCategory;
  description?: string;
  actionUrl?: string;
  workspaceId?: string;
  id?: string;
}

async function persistNotification(
  type: "info" | "success" | "warning" | "error",
  title: string,
  opts: CategoryNotifyOptions
) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        category: opts.category,
        title,
        description: opts.description,
        actionUrl: opts.actionUrl,
        workspaceId: opts.workspaceId,
      }),
    });
  } catch (error) {
    console.error("Failed to persist notification:", error);
  }
}

export function notifySuccessWithCategory(
  title: string,
  opts: CategoryNotifyOptions
) {
  if (!shouldShowToast(opts.id)) return;
  toast.success(title, { description: opts.description });
  pushToBell("success", title, opts.description);
  persistNotification("success", title, opts);
}

export function notifyErrorWithCategory(
  title: string,
  opts: CategoryNotifyOptions
) {
  if (!shouldShowToast(opts.id)) return;
  toast.error(title, { description: opts.description });
  pushToBell("error", title, opts.description);
  persistNotification("error", title, opts);
}

export function notifyWarningWithCategory(
  title: string,
  opts: CategoryNotifyOptions
) {
  if (!shouldShowToast(opts.id)) return;
  toast.warning(title, { description: opts.description });
  pushToBell("warning", title, opts.description);
  persistNotification("warning", title, opts);
}

export function notifyInfoWithCategory(
  title: string,
  opts: CategoryNotifyOptions
) {
  if (!shouldShowToast(opts.id)) return;
  toast.info(title, { description: opts.description });
  pushToBell("info", title, opts.description);
  persistNotification("info", title, opts);
}
