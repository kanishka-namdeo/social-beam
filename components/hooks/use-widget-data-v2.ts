import { useEffect, useState, useCallback } from "react";
import { usePremium } from "@/hooks/use-premium";
import type { UserRole } from "@/lib/role-guard";

interface WidgetDataResponse {
  data: unknown;
  error?: string;
}

interface UseWidgetDataV2Result {
  data: Record<string, unknown>;
  loading: boolean;
  errors: Record<string, string>;
}

interface UseWidgetDataV2Options {
  widgetIds: string[];
  sizes?: Record<string, string>;
}

const BATCH_SIZE = 5;

async function fetchWidgetData(
  widgetId: string,
  size: string,
  role: UserRole,
  signal?: AbortSignal
): Promise<WidgetDataResponse> {
  try {
    const res = await fetch(
      `/api/dashboard/widgets?id=${encodeURIComponent(widgetId)}&size=${encodeURIComponent(size)}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      }
    );

    if (res.status === 403) {
      return {
        data: { locked: true, reason: "premium_required" },
      };
    }

    if (!res.ok) {
      return {
        data: null,
        error: `Failed to fetch widget data: ${res.status}`,
      };
    }

    const json = await res.json();
    return { data: json.data };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function useWidgetDataV2(options: UseWidgetDataV2Options): UseWidgetDataV2Result {
  const { widgetIds, sizes = {} } = options;
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { role } = usePremium();

  const fetchBatch = useCallback(
    async (batch: string[], signal?: AbortSignal) => {
      const results: Record<string, WidgetDataResponse> = {};

      await Promise.all(
        batch.map(async (widgetId) => {
          const size = sizes[widgetId] ?? "5x2";
          results[widgetId] = await fetchWidgetData(widgetId, size, role as UserRole, signal);
        })
      );

      return results;
    },
    [sizes, role]
  );

  useEffect(() => {
    const ac = new AbortController();

    const fetchAll = async () => {
      if (widgetIds.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const newData: Record<string, unknown> = {};
      const newErrors: Record<string, string> = {};

      for (let i = 0; i < widgetIds.length; i += BATCH_SIZE) {
        if (ac.signal.aborted) break;

        const batch = widgetIds.slice(i, i + BATCH_SIZE);
        const batchResults = await fetchBatch(batch, ac.signal);

        Object.entries(batchResults).forEach(([widgetId, result]) => {
          if (result.error) {
            newErrors[widgetId] = result.error;
          }
          newData[widgetId] = result.data;
        });
      }

      if (!ac.signal.aborted) {
        setData(newData);
        setErrors(newErrors);
        setLoading(false);
      }
    };

    void fetchAll();

    return () => { ac.abort(); };
  }, [widgetIds, fetchBatch]);

  return { data, loading, errors };
}

export function useWidgetDataV2Single(
  widgetId: string,
  size: string = "5x2"
): {
  data: unknown;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { role } = usePremium();

  useEffect(() => {
    const ac = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const result = await fetchWidgetData(widgetId, size, role as UserRole, ac.signal);

      if (!ac.signal.aborted) {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data);
        }
        setLoading(false);
      }
    };

    void fetchData();

    return () => { ac.abort(); };
  }, [widgetId, size, role]);

  return { data, loading, error };
}
