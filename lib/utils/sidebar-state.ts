"use client";

import { useState, useCallback, useEffect } from "react";

export type SidebarCollapsible = "offcanvas" | "icon" | "none";

export interface SidebarConfig {
  collapsible: SidebarCollapsible;
}

const STORAGE_KEY = "sidebar-config";

const DEFAULT_CONFIG: SidebarConfig = {
  collapsible: "icon",
};

function loadConfig(): SidebarConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SidebarConfig>;
      return {
        collapsible: parsed.collapsible ?? DEFAULT_CONFIG.collapsible,
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: SidebarConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function useSidebarPreference() {
  // Always initialize with DEFAULT_CONFIG so SSR and hydration produce identical
  // output. Reading from localStorage during initial state causes a mismatch
  // because localStorage is unavailable on the server.
  const [config, setConfig] = useState<SidebarConfig>(DEFAULT_CONFIG);

  // Load persisted config after hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadConfig());
  }, []);

  const updateConfig = useCallback((updates: Partial<SidebarConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const setCollapsible = useCallback(
    (collapsible: SidebarCollapsible) => updateConfig({ collapsible }),
    [updateConfig]
  );

  const toggleCollapse = useCallback(() => {
    setConfig((prev) => {
      const next =
        prev.collapsible === "icon"
          ? { ...prev, collapsible: "offcanvas" as const }
          : { ...prev, collapsible: "icon" as const };
      saveConfig(next);
      return next;
    });
  }, []);

  return {
    config,
    setCollapsible,
    toggleCollapse,
    updateConfig,
  };
}
