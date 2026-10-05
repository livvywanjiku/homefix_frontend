/*
 * Display formatting.
 *
 * Money crosses the API as integer minor units (`*_cents`) so no arithmetic
 * ever touches a float; these helpers are the only place it becomes a string.
 */

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  // Kenyan shilling prices in this market are quoted in whole shillings
  // ("KSh 1,500"), and the spec's price list follows that — so cents are
  // dropped unless a value actually has them.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const KES_WITH_CENTS = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer cents as Kenyan shillings.
 *
 * `Intl` renders KES as "Ksh" in some ICU builds; the spec writes "KSh", so the
 * output is normalised to match rather than left to the runtime's locale data.
 */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";

  const formatter = cents % 100 === 0 ? KES : KES_WITH_CENTS;

  return formatter.format(cents / 100).replace(/^Ksh/i, "KSh");
}

/** A price floor, as shown on a search result card: "From KSh 1,500". */
export function formatFrom(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Price on request";

  return `From ${formatMoney(cents)}`;
}

/** Money a professional earns, before the platform's share is discussed. */
export function formatCompactMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";

  const shillings = cents / 100;

  if (shillings >= 1_000_000) return `KSh ${(shillings / 1_000_000).toFixed(1)}M`;
  if (shillings >= 1_000) return `KSh ${Math.round(shillings / 1_000)}K`;

  return formatMoney(cents);
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

/*
 * Dates arrive from Laravel as ISO-8601 strings. `null` is a real possibility
 * on almost every timestamp in this domain (a booking has no `completed_at`
 * until it is completed), so every helper accepts it and renders an em dash
 * rather than "Invalid Date".
 */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE.format(date) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE_TIME.format(date) : "—";
}

export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? TIME.format(date) : "—";
}

/** "8:00 AM – 6:00 PM", from a 24-hour "08:00:00" column pair. */
export function formatTimeRange(start: string, end: string): string {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

/** "08:00:00" -> "8:00 AM" */
export function formatClock(time: string | null | undefined): string {
  if (!time) return "—";

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const period = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;

  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** "3 days ago", for message and notification timestamps. */
export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value);

  if (!date) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }

  return "just now";
}

/** "Mon", "Tue", … from the ISO day-of-week integer used by `availability`. */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(day: number): string {
  return WEEKDAYS[day] ?? "—";
}

export const WEEKDAY_OPTIONS = WEEKDAYS.map((name, value) => ({ value, name }));
