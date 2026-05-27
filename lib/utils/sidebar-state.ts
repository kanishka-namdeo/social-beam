"use client";

import { useState, useCallback } from "react";

export type SidebarVariant = "sidebar" | "floating";
export type SidebarCollapsible = "offcanvas" | "icon" | "none";

export interface SidebarConfig {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
}

const STORAGE_KEY = "sidebar-config";

const DEFAULT_CONFIG: SidebarConfig = {
  variant: "sidebar",
  collapsible: "offcanvas",
};

function loadConfig(): SidebarConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SidebarConfig>;
      return {
        variant: parsed.variant ?? DEFAULT_CONFIG.variant,
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
  const [config, setConfig] = useState<SidebarConfig>(loadConfig);

  const updateConfig = useCallback((updates: Partial<SidebarConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const setVariant = useCallback(
    (variant: SidebarVariant) => updateConfig({ variant }),
    [updateConfig]
  );

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
    setVariant,
    setCollapsible,
    toggleCollapse,
    updateConfig,
  };
}
