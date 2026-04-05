export function getMonday(date: Date): Date {
  return getWeekStart(date, "monday");
}

export function getWeekStart(date: Date, startDay: "monday" | "sunday" = "monday"): Date {
  const d = new Date(date);
  const day = d.getDay();
  if (startDay === "monday") {
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
  } else {
    d.setDate(d.getDate() - day);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const monStr = monday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const sunStr = sunday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${monStr} – ${sunStr}`;
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isCurrentWeek(monday: Date): boolean {
  const now = new Date();
  const currentMonday = getMonday(now);
  return isSameDay(monday, currentMonday);
}

export function toDateOnlyISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the YYYY-MM-DD string for `date` as seen in `tz`
 * (e.g. "Europe/Moscow"). Falls back to local (server) time
 * if tz is empty or invalid.
 */
export function toDateOnlyISOInTz(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const d = parts.find((p) => p.type === "day")!.value;
    return `${y}-${m}-${d}`;
  } catch {
    return toDateOnlyISO(date);
  }
}

/**
 * Returns a Date set to midnight UTC for the "today" date in the given tz.
 * Useful for building a Date that represents the calendar day in the user's
 * timezone without shifting.
 */
export function todayDateInTz(tz: string): Date {
  const iso = toDateOnlyISOInTz(new Date(), tz);
  return new Date(iso + "T00:00:00.000Z");
}

/**
 * Returns the Monday of the week that contains `date` as seen in `tz`.
 */
export function getMondayInTz(date: Date, tz: string): Date {
  const todayISO = toDateOnlyISOInTz(date, tz);
  const local = new Date(todayISO + "T12:00:00.000Z");
  const day = local.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setUTCDate(local.getUTCDate() + diff);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}
