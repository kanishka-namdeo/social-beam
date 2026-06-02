"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface InvisibleAIConfig {
  showAILabels: boolean;
  showConfidence: boolean;
  showAgentStatus: boolean;
  showAIInsightsBadge: boolean;
}

const DEFAULT_CONFIG: InvisibleAIConfig = {
  showAILabels: false,
  showConfidence: false,
  showAgentStatus: false,
  showAIInsightsBadge: false,
};

const STORAGE_KEY = "socialbeam-invisible-ai";

function loadConfig(): InvisibleAIConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Corrupted storage — return defaults
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: InvisibleAIConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

interface InvisibleAIContextValue {
  config: InvisibleAIConfig;
  updateConfig: (patch: Partial<InvisibleAIConfig>) => void;
}

const InvisibleAIContext = createContext<InvisibleAIContextValue | undefined>(undefined);

export function InvisibleAIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<InvisibleAIConfig>(loadConfig);

  const updateConfig = useCallback((patch: Partial<InvisibleAIConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  return (
    <InvisibleAIContext.Provider value={{ config, updateConfig }}>
      {children}
    </InvisibleAIContext.Provider>
  );
}

export function useInvisibleAI(): InvisibleAIContextValue {
  const ctx = useContext(InvisibleAIContext);
  if (!ctx) {
    throw new Error("useInvisibleAI must be used within InvisibleAIProvider");
  }
  return ctx;
}
