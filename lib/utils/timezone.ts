/**
 * Format a date in a specific timezone using native Intl API
 * @param date - The date to format
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param formatStr - Format string: "time" | "date" | "datetime" | "full"
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatStr: "time" | "date" | "datetime" | "full" = "datetime"
): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (formatStr) {
      case "time":
        options.hour = "numeric";
        options.minute = "2-digit";
        options.hour12 = true;
        break;
      case "date":
        options.year = "numeric";
        options.month = "short";
        options.day = "numeric";
        break;
      case "datetime":
        options.year = "numeric";
        options.month = "short";
        options.day = "numeric";
        options.hour = "numeric";
        options.minute = "2-digit";
        options.hour12 = true;
        break;
      case "full":
        options.weekday = "long";
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
        options.hour = "numeric";
        options.minute = "2-digit";
        options.hour12 = true;
        break;
    }

    return new Intl.DateTimeFormat("en-US", options).format(date);
  } catch (error) {
    // Fallback to local time if timezone is invalid
    console.warn(`Invalid timezone: ${timezone}, falling back to local time`);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

/**
 * Get timezone offset in minutes from UTC
 * @param timezone - IANA timezone string
 * @param date - Date to calculate offset for (defaults to now)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  try {
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000; // offset in minutes
  } catch {
    return 0; // Default to UTC if invalid
  }
}

/**
 * Adjust date boundaries to account for timezone offset
 * @param year - Year
 * @param month - Month (0-indexed)
 * @param timezone - IANA timezone string
 * @returns Adjusted start and end dates for the month
 */
export function getMonthBoundariesInTimezone(
  year: number,
  month: number,
  timezone: string
): { start: Date; end: Date } {
  const offset = getTimezoneOffset(timezone);
  const offsetMs = offset * 60000;

  // Start of month in target timezone
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0) - offsetMs);
  // End of month in target timezone
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - offsetMs);

  return { start, end };
}
