/**
 * Dates in this app are plain YYYY-MM-DD calendar dates, and the user is in
 * Yangon (Asia/Yangon, UTC+6:30). "Today" / "this month" must therefore be
 * computed in Yangon time, not UTC: at 00:30 local on 1 Nov it is still
 * 31 Oct in UTC, so UTC math puts that morning's spending in the wrong
 * month and flags loans overdue a day late.
 *
 * These helpers use Intl with an explicit time zone, so they are correct
 * no matter where the server runs.
 */

const yangonFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Yangon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface YangonParts {
  year: number;
  /** 0-based, like Date.getMonth(). */
  month: number;
  day: number;
}

export function getYangonParts(now = new Date()): YangonParts {
  const parts = yangonFormatter.formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")) - 1,
    day: Number(byType.get("day")),
  };
}

/** YYYY-MM-DD calendar date in Yangon for the given instant. */
export function getYangonDateString(now = new Date()): string {
  return yangonFormatter.format(now);
}

/** YYYY-MM-DD for a Yangon calendar date (year, 0-based month, day). */
export function toDateString(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
