export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
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
