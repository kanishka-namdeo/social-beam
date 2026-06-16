"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass, X, Funnel, Calendar } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { typeLabelMap, typeIconMap, statusLabelMap, type ActivityType, type ActivityStatus } from "@/lib/activity-utils";

interface ActivityFiltersProps {
  selectedTypes: ActivityType[];
  selectedStatuses: ActivityStatus[];
  searchQuery: string;
  startDate: string;
  endDate: string;
  runningOnly: boolean;
  onTypesChange: (types: ActivityType[]) => void;
  onStatusesChange: (statuses: ActivityStatus[]) => void;
  onSearchChange: (query: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRunningOnlyChange: (enabled: boolean) => void;
  onClearAll: () => void;
}

export function ActivityFilters({
  selectedTypes,
  selectedStatuses,
  searchQuery,
  startDate,
  endDate,
  runningOnly,
  onTypesChange,
  onStatusesChange,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
  onRunningOnlyChange,
  onClearAll,
}: ActivityFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedStatuses.length > 0 || searchQuery.length > 0 || startDate || endDate || runningOnly;

  const toggleType = (type: ActivityType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleStatus = (status: ActivityStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search in details..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Funnel className="size-4" />
            Type
            {selectedTypes.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {selectedTypes.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {(Object.keys(typeLabelMap) as ActivityType[]).map((type) => {
            const TypeIcon = typeIconMap[type];
            return (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
                className="gap-2"
              >
                <TypeIcon className="size-4" />
                {typeLabelMap[type]}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Funnel className="size-4" />
            Status
            {selectedStatuses.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {selectedStatuses.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {(Object.keys(statusLabelMap) as ActivityStatus[]).map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={() => toggleStatus(status)}
            >
              {statusLabelMap[status]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-2">
          <X className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
