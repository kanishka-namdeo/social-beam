"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ActivityFilters } from "./activity-filters";
import { ActivityTable, type ActivityLogWithProcess } from "./activity-table";
import { ActivityDetailsModal } from "./activity-details-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@phosphor-icons/react";
import type {
  ActivityType,
  ActivityStatus,
} from "@/lib/activity-utils";

interface ActivityClientProps {
  initialLogs: ActivityLogWithProcess[];
}

export function ActivityClient({ initialLogs }: ActivityClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>(() => {
    const types = searchParams.get("type");
    return types ? (types.split(",") as ActivityType[]) : [];
  });

  const [selectedStatuses, setSelectedStatuses] = useState<ActivityStatus[]>(
    () => {
      const statuses = searchParams.get("status");
      return statuses ? (statuses.split(",") as ActivityStatus[]) : [];
    }
  );

  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("search") ?? "";
  });

  const [startDate, setStartDate] = useState(() => {
    return searchParams.get("startDate") ?? "";
  });

  const [endDate, setEndDate] = useState(() => {
    return searchParams.get("endDate") ?? "";
  });

  const [runningOnly, setRunningOnly] = useState(() => {
    return searchParams.get("running") === "true";
  });

  const [logs, setLogs] = useState<ActivityLogWithProcess[]>(initialLogs ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLogWithProcess | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateURL = useCallback(
    (
      types: ActivityType[],
      statuses: ActivityStatus[],
      search: string,
      start: string,
      end: string,
      running: boolean
    ) => {
      const params = new URLSearchParams();
      if (types.length > 0) params.set("type", types.join(","));
      if (statuses.length > 0) params.set("status", statuses.join(","));
      if (search) params.set("search", search);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      if (running) params.set("running", "true");

      const queryString = params.toString();
      router.push(queryString ? `/activity?${queryString}` : "/activity", {
        scroll: false,
      });
    },
    [router]
  );

  const fetchLogs = useCallback(
    async (
      types: ActivityType[],
      statuses: ActivityStatus[],
      search: string,
      start: string,
      end: string,
      running: boolean,
      cursor?: string,
      signal?: AbortSignal
    ) => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        params.set("include", "process");

        if (types.length > 0) params.set("type", types.join(","));
        if (statuses.length > 0) params.set("status", statuses.join(","));
        if (search) params.set("search", search);
        if (start) params.set("startDate", start);
        if (end) params.set("endDate", end);
        if (running) params.set("status", "RUNNING");
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/activity/logs?${params}`, { signal });
        if (!response.ok) throw new Error("Failed to fetch logs");

        const data = await response.json();
        return {
          items: data.items,
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { items: [], nextCursor: null, hasMore: false };
        }
        console.error("Error fetching activity logs:", error);
        return { items: [], nextCursor: null, hasMore: false };
      }
    },
    []
  );

  const handleTypesChange = useCallback(
    (types: ActivityType[]) => {
      setSelectedTypes(types);
      updateURL(types, selectedStatuses, searchQuery, startDate, endDate, runningOnly);
      fetchLogs(types, selectedStatuses, searchQuery, startDate, endDate, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedStatuses, searchQuery, startDate, endDate, runningOnly, updateURL, fetchLogs]
  );

  const handleStatusesChange = useCallback(
    (statuses: ActivityStatus[]) => {
      setSelectedStatuses(statuses);
      updateURL(selectedTypes, statuses, searchQuery, startDate, endDate, runningOnly);
      fetchLogs(selectedTypes, statuses, searchQuery, startDate, endDate, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedTypes, searchQuery, startDate, endDate, runningOnly, updateURL, fetchLogs]
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchQuery(search);
      updateURL(selectedTypes, selectedStatuses, search, startDate, endDate, runningOnly);
      fetchLogs(selectedTypes, selectedStatuses, search, startDate, endDate, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedTypes, selectedStatuses, startDate, endDate, runningOnly, updateURL, fetchLogs]
  );

  const handleStartDateChange = useCallback(
    (date: string) => {
      setStartDate(date);
      updateURL(selectedTypes, selectedStatuses, searchQuery, date, endDate, runningOnly);
      fetchLogs(selectedTypes, selectedStatuses, searchQuery, date, endDate, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedTypes, selectedStatuses, searchQuery, endDate, runningOnly, updateURL, fetchLogs]
  );

  const handleEndDateChange = useCallback(
    (date: string) => {
      setEndDate(date);
      updateURL(selectedTypes, selectedStatuses, searchQuery, startDate, date, runningOnly);
      fetchLogs(selectedTypes, selectedStatuses, searchQuery, startDate, date, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedTypes, selectedStatuses, searchQuery, startDate, runningOnly, updateURL, fetchLogs]
  );

  const handleRunningOnlyChange = useCallback(
    (enabled: boolean) => {
      setRunningOnly(enabled);
      updateURL(selectedTypes, selectedStatuses, searchQuery, startDate, endDate, enabled);
      fetchLogs(selectedTypes, selectedStatuses, searchQuery, startDate, endDate, enabled).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    },
    [selectedTypes, selectedStatuses, searchQuery, startDate, endDate, updateURL, fetchLogs]
  );

  const handleClearAll = useCallback(() => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setRunningOnly(false);
    updateURL([], [], "", "", "", false);
    fetchLogs([], [], "", "", "", false).then((data) => {
      setLogs(data.items ?? []);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    });
  }, [updateURL, fetchLogs]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const data = await fetchLogs(
      selectedTypes,
      selectedStatuses,
      searchQuery,
      startDate,
      endDate,
      runningOnly,
      nextCursor
    );
    setLogs((prev) => [...prev, ...(data.items ?? [])]);
    setNextCursor(data.nextCursor);
    setHasMore(data.hasMore);
    setIsLoadingMore(false);
  }, [
    nextCursor,
    isLoadingMore,
    fetchLogs,
    selectedTypes,
    selectedStatuses,
    searchQuery,
    startDate,
    endDate,
    runningOnly,
  ]);

  const handleRowClick = useCallback((log: ActivityLogWithProcess) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  }, []);

  const handleCancel = useCallback(async (logId: string) => {
    try {
      const response = await fetch(`/api/activity/logs/${logId}/cancel`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to cancel process");
      }
      // Refresh logs after cancellation
      fetchLogs(selectedTypes, selectedStatuses, searchQuery, startDate, endDate, runningOnly).then((data) => {
        setLogs(data.items ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      });
    } catch (error) {
      console.error("Error cancelling process:", error);
      throw error;
    }
  }, [selectedTypes, selectedStatuses, searchQuery, startDate, endDate, runningOnly, fetchLogs]);

  useEffect(() => {
    const hasFilters =
      selectedTypes.length > 0 ||
      selectedStatuses.length > 0 ||
      searchQuery.length > 0 ||
      startDate ||
      endDate ||
      runningOnly;

    if (hasFilters) {
      // Abort any in-flight fetch to prevent stale responses
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetchLogs(selectedTypes, selectedStatuses, searchQuery, startDate, endDate, runningOnly, undefined, controller.signal).then((data) => {
        if (!controller.signal.aborted) {
          setLogs(data.items ?? []);
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      });
    }

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <ActivityFilters
        selectedTypes={selectedTypes}
        selectedStatuses={selectedStatuses}
        searchQuery={searchQuery}
        startDate={startDate}
        endDate={endDate}
        runningOnly={runningOnly}
        onTypesChange={handleTypesChange}
        onStatusesChange={handleStatusesChange}
        onSearchChange={handleSearchChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onRunningOnlyChange={handleRunningOnlyChange}
        onClearAll={handleClearAll}
      />

      <ActivityTable logs={logs} onRowClick={handleRowClick} onCancel={handleCancel} />

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="gap-2"
          >
            {isLoadingMore ? (
              <>
                <Spinner className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {!hasMore && (!logs || logs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No activity found</h3>
          <p className="text-sm text-muted-foreground">
            {selectedTypes.length > 0 ||
            selectedStatuses.length > 0 ||
            searchQuery ||
            startDate ||
            endDate ||
            runningOnly
              ? "Try adjusting your filters"
              : "Activity logs will appear here as tasks run in your workspace."}
          </p>
        </div>
      )}

      <ActivityDetailsModal
        log={selectedLog}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
