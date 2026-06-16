const STORAGE_KEY = "socialbeam-notifications";

/**
 * Migrates notifications from localStorage to the server database.
 * This is a one-time migration for existing users who had notifications
 * stored locally before the server-side persistence system was implemented.
 *
 * Call this once on dashboard mount to migrate any existing localStorage
 * notifications to the database, then clear the localStorage key.
 */
export async function migrateLocalStorageNotifications(): Promise<void> {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const notifications = JSON.parse(raw);

    // Validate that we have an array of notifications
    if (!Array.isArray(notifications) || notifications.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // POST to batch migrate endpoint
    const res = await fetch("/api/notifications/batch-migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications }),
    });

    if (res.ok) {
      const data = await res.json();
      console.info("[migrate-local-storage] Migration complete", {
        migratedCount: data.count,
      });
      localStorage.removeItem(STORAGE_KEY);
    } else {
      console.warn("[migrate-local-storage] Migration failed", {
        status: res.status,
      });
    }
  } catch (error) {
    console.error("[migrate-local-storage] Migration error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
