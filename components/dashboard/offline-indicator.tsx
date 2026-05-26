"use client";

import { useEffect, useState } from "react";
import { WifiSlash, Spinner } from "@phosphor-icons/react/ssr";
import { Alert, AlertDescription } from "@/components/ui/alert";

type NetworkStatus = "online" | "offline" | "reconnecting";

export function OfflineIndicator() {
  const [status, setStatus] = useState<NetworkStatus>("online");

  useEffect(() => {
    if (!navigator.onLine) {
      setStatus("offline");
    }

    const handleOffline = () => {
      setStatus("offline");
    };

    const handleOnline = () => {
      setStatus("reconnecting");
      const timer = setTimeout(() => {
        setStatus("online");
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "online") return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-b border-border bg-muted/50">
      <WifiSlash className="size-4 text-muted-foreground" weight="bold" />
      <AlertDescription className="text-muted-foreground">
        {status === "offline"
          ? "You're offline. Some features may not work until you're back online."
          : "Reconnecting..."}
      </AlertDescription>
      {status === "reconnecting" && (
        <Spinner className="size-3 animate-spin text-muted-foreground" weight="bold" />
      )}
    </Alert>
  );
}
