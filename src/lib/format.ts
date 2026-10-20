// Dates are shown in Cairo time wherever the dashboard is opened from.
const CAIRO = "Africa/Cairo";

const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO, day: "2-digit", month: "short" });
const hourMinute = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAIRO,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const year = new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO, year: "numeric" });
// en-CA prints YYYY-MM-DD.
const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The dashboard file's `dt()`: `2026-10-07T11:05:00.000Z` → `07 Oct 14:05` (Cairo). */
export function formatStamp(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? `${dayMonth.format(date)} ${hourMinute.format(date)}` : "—";
}

/** With the year, for the order and message pages: `07 Oct 2026 14:05` (Cairo). */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? `${dayMonth.format(date)} ${year.format(date)} ${hourMinute.format(date)}` : "—";
}

/** The dashboard file's `f()` for numbers that are not money: `1284.5` → `1,284.5`. */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

/** Today's date in Cairo as `YYYY-MM-DD`, the form date inputs and the API use. */
export function cairoToday(now: Date = new Date()): string {
  return isoDay.format(now);
}
