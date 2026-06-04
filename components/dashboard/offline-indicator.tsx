"use client";

import { useEffect, useState, useRef } from "react";
import { WifiSlash, Spinner } from "@phosphor-icons/react/ssr";
import { Alert, AlertDescription } from "@/components/ui/alert";

type NetworkStatus = "online" | "offline" | "reconnecting";

export function OfflineIndicator() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!navigator.onLine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("offline");
    }

    const handleOffline = () => {
      setStatus("offline");
    };

    const handleOnline = () => {
      setStatus("reconnecting");
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        setStatus("online");
        reconnectTimerRef.current = null;
      }, 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  if (status === "online") return null;

  return (
    <Alert
      variant="destructive"
      className="mx-auto max-w-3xl rounded-sm border-x border-t-0"
    >
      <WifiSlash className="size-4" weight="bold" />
      <AlertDescription>
        {status === "offline"
          ? "You are offline. Some features may not work until you reconnect."
          : "Reconnecting..."}
      </AlertDescription>
      {status === "reconnecting" && (
        <Spinner className="size-3 animate-spin" weight="bold" />
      )}
    </Alert>
  );
}
