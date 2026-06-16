"use client";

import { Globe } from "@phosphor-icons/react/ssr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONE_GROUPS = [
  {
    label: "UTC",
    options: [{ value: "UTC", label: "UTC" }],
  },
  {
    label: "Americas",
    options: [
      { value: "America/New_York", label: "US Eastern" },
      { value: "America/Chicago", label: "US Central" },
      { value: "America/Denver", label: "US Mountain" },
      { value: "America/Los_Angeles", label: "US Pacific" },
      { value: "America/Sao_Paulo", label: "Brazil" },
      { value: "America/Mexico_City", label: "Mexico" },
    ],
  },
  {
    label: "Europe",
    options: [
      { value: "Europe/London", label: "London" },
      { value: "Europe/Paris", label: "Paris" },
      { value: "Europe/Berlin", label: "Berlin" },
      { value: "Europe/Moscow", label: "Moscow" },
    ],
  },
  {
    label: "Asia / Pacific",
    options: [
      { value: "Asia/Dubai", label: "Dubai" },
      { value: "Asia/Kolkata", label: "Mumbai" },
      { value: "Asia/Singapore", label: "Singapore" },
      { value: "Asia/Tokyo", label: "Tokyo" },
      { value: "Australia/Sydney", label: "Sydney" },
    ],
  },
];

interface TimezoneSelectorProps {
  value: string;
  onChange: (tz: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36" aria-label="Select timezone">
        <Globe className="size-3.5 text-muted-foreground mr-1" />
        <SelectValue placeholder="Timezone" />
      </SelectTrigger>
      <SelectContent>
        {TIMEZONE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 py-1.5 text-micro font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </div>
            {group.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
