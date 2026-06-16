"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  unregisterPush,
  registerServiceWorker,
} from "./push-manager";

type PushPermission = NotificationPermission | "unsupported" | "unknown";

interface PushContextValue {
  supported: boolean;
  permission: PushPermission;
  subscribed: boolean;
  loading: boolean;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
}

const PushContext = createContext<PushContextValue | null>(null);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pushSupported = isPushSupported();
    setSupported(pushSupported);

    if (!pushSupported) {
      setPermission("unsupported");
      setLoading(false);
      return;
    }

    const currentPermission = getPushPermissionStatus();
    setPermission(currentPermission);

    if (currentPermission === "granted") {
      checkSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/service-worker.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      }
    } catch (error) {
      console.error("[push-context] Failed to check subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    setLoading(true);
    try {
      const result = await requestPushPermission();
      setPermission(result.permission);
      setSubscribed(result.subscribed);
      return result.subscribed;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const disablePush = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    setLoading(true);
    try {
      const success = await unregisterPush();
      if (success) {
        setSubscribed(false);
        setPermission(getPushPermissionStatus());
      }
      return success;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return (
    <PushContext.Provider
      value={{
        supported,
        permission,
        subscribed,
        loading,
        enablePush,
        disablePush,
      }}
    >
      {children}
    </PushContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushContext);
  if (!context) {
    throw new Error("usePushNotifications must be used within PushNotificationProvider");
  }
  return context;
}
