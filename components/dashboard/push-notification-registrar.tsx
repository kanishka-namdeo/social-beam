"use client";

import { useEffect } from "react";
import { isPushSupported, registerServiceWorker } from "@/lib/notifications/push-manager";

export function PushNotificationRegistrar() {
  useEffect(() => {
    if (!isPushSupported()) return;

    registerServiceWorker().catch((error) => {
      console.error("[push-registrar] Failed to register service worker:", error);
    });
  }, []);

  return null;
}
