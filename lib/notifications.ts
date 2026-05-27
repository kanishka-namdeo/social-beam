import { toast } from "sonner";

/**
 * Centralized notification utilities for the SocialBeam app.
 * All toasts flow through this module to ensure consistent messaging,
 * iconography, and user feedback patterns.
 */

// ── Success Notifications ──────────────────────────────────────────────

export function notifySuccess(title: string, description?: string) {
  toast.success(title, { description });
}

export function notifyPostCreated(action: "draft" | "publish" | "schedule", id?: string) {
  const labels = {
    draft: "Draft saved",
    publish: "Post published",
    schedule: "Post scheduled",
  };
  toast.success(labels[action], {
    description: id ? `Post ID: ${id.slice(0, 8)}` : undefined,
  });
}

export function notifyAccountConnected(platform: string) {
  toast.success(`${platform} connected`, {
    description: "Your account has been linked successfully.",
  });
}

export function notifyAccountDisconnected(platform: string) {
  toast.info(`${platform} disconnected`, {
    description: "The account has been removed from your workspace.",
  });
}

export function notifyMediaUploaded(count: number) {
  toast.success(`${count} file${count > 1 ? "s" : ""} uploaded`, {
    description: "Media added to your library.",
  });
}

export function notifyMediaDeleted() {
  toast.success("Media deleted", {
    description: "The asset has been removed permanently.",
  });
}

export function notifyMediaCopied() {
  toast.success("Link copied", {
    description: "Media URL copied to clipboard.",
  });
}

export function notifySettingsSaved() {
  toast.success("Settings saved", {
    description: "Your changes have been applied.",
  });
}

export function notifyBrandContextSaved() {
  toast.success("Brand context updated", {
    description: "Your brand profile has been saved.",
  });
}

export function notifyTrendsRefreshed() {
  toast.success("Trends refreshed", {
    description: "Latest trending posts have been fetched.",
  });
}

export function notifyTrendCopied() {
  toast.success("Insight copied", {
    description: "Trend analysis copied to clipboard.",
  });
}

export function notifyCalendarEventRescheduled() {
  toast.success("Post rescheduled", {
    description: "The post has been moved to the new date.",
  });
}

export function notifyCalendarEventDeleted() {
  toast.success("Post deleted", {
    description: "The scheduled post has been removed.",
  });
}

export function notifyCreditsRefilled(amount: number) {
  toast.success("Credits refilled", {
    description: `${amount} AI credits added to your balance.`,
  });
}

export function notifyLoginSuccess() {
  toast.success("Welcome back!", {
    description: "You've been signed in successfully.",
  });
}

export function notifyRegisterSuccess() {
  toast.success("Account created", {
    description: "Welcome to SocialBeam! Let's set up your workspace.",
  });
}

export function notifyPasswordReset() {
  toast.success("Password reset email sent", {
    description: "Check your inbox for the reset link.",
  });
}

export function notifyLearningSignalCaptured() {
  toast.success("Feedback captured", {
    description: "We'll use this to improve AI suggestions.",
  });
}

export function notifySuggestionsApplied() {
  toast.success("Suggestions applied", {
    description: "Your brand context has been updated.",
  });
}

export function notifyOnboardingComplete() {
  toast.success("Setup complete!", {
    description: "Your workspace is ready. Start composing your first post.",
  });
}

// ── Error Notifications ────────────────────────────────────────────────

export function notifyError(title: string, description?: string) {
  toast.error(title, { description });
}

export function notifyApiError(operation: string, message?: string) {
  toast.error(`Failed to ${operation}`, {
    description: message ?? "Something went wrong. Please try again.",
    duration: 6000,
  });
}

export function notifyAuthError(message?: string) {
  toast.error("Authentication error", {
    description: message ?? "Please sign in again.",
    duration: 6000,
  });
}

export function notifyValidationError(field: string, message: string) {
  toast.error(`Invalid ${field}`, {
    description: message,
    duration: 4000,
  });
}

export function notifyCreditInsufficient() {
  toast.error("Insufficient credits", {
    description: "You've run out of AI credits. Contact support to refill.",
    duration: 6000,
  });
}

export function notifyPlatformLimitExceeded(platform: string) {
  toast.error(`${platform} limit reached`, {
    description: "You've hit the API rate limit. Try again in a few minutes.",
    duration: 6000,
  });
}

export function notifyUploadFailed() {
  toast.error("Upload failed", {
    description: "The file could not be uploaded. Check the format and size.",
    duration: 5000,
  });
}

export function notifyNetworkError() {
  toast.error("Network error", {
    description: "Check your connection and try again.",
    duration: 5000,
  });
}

// ── Warning Notifications ──────────────────────────────────────────────

export function notifyWarning(title: string, description?: string) {
  toast.warning(title, { description });
}

export function notifyUnsavedChanges() {
  toast.warning("Unsaved changes", {
    description: "You have unsaved content. Save before leaving.",
    duration: 4000,
  });
}

export function notifyLowCredits(balance: number) {
  toast.warning("Low AI credits", {
    description: `You have ${balance} credits remaining.`,
    duration: 5000,
  });
}

export function notifySessionExpiring() {
  toast.warning("Session expiring soon", {
    description: "Your session will expire in 5 minutes.",
    duration: 5000,
  });
}

export function notifyPlatformTokenExpired(platform: string) {
  toast.warning(`${platform} token expired`, {
    description: "Please reconnect your account in Settings.",
    duration: 6000,
  });
}

// ── Info Notifications ─────────────────────────────────────────────────

export function notifyInfo(title: string, description?: string) {
  toast.info(title, { description });
}

export function notifyFeatureHint(feature: string, hint: string) {
  toast.info(feature, {
    description: hint,
    duration: 5000,
  });
}

export function notifyFirstVisitWelcome() {
  toast.info("Welcome to SocialBeam!", {
    description: "Connect an account to start scheduling posts.",
    duration: 6000,
  });
}

export function notifyOfflineMode() {
  toast.info("Offline mode", {
    description: "Some features may not work without an internet connection.",
    duration: 4000,
  });
}

// ── Loading Notifications (promise-based) ──────────────────────────────

export function notifyWithLoading<T>(
  promise: Promise<T>,
  opts: { loading: string; success: string; error: string },
) {
  toast.promise(promise, {
    loading: opts.loading,
    success: opts.success,
    error: opts.error,
  });
}
