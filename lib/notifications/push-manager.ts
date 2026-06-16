const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.error("[push-manager] Service worker registration failed:", error);
    return null;
  }
}

export async function requestPushPermission(): Promise<{
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}> {
  if (!isPushSupported()) {
    return { permission: "unsupported", subscribed: false };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { permission, subscribed: false };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { permission, subscribed: false };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });

  await savePushSubscription(subscription);
  return { permission, subscribed: true };
}

export async function savePushSubscription(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok;
  } catch (error) {
    console.error("[push-manager] Failed to save push subscription:", error);
    return false;
  }
}

export async function unregisterPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/service-worker.js");
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    await fetch("/api/notifications/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return true;
  } catch (error) {
    console.error("[push-manager] Failed to unregister push:", error);
    return false;
  }
}
