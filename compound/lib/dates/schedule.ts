import type { Weekday } from "@/lib/db/types";

const SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A short, readable summary of a habit's scheduled weekdays:
 * "Every day", "Weekdays", "Weekends", or a list like "Mon, Wed, Fri".
 */
export function describeSchedule(days: readonly Weekday[]): string {
  const set = new Set(days);
  const has = (list: Weekday[]) => set.size === list.length && list.every((d) => set.has(d));

  if (set.size === 7) return "Every day";
  if (has([1, 2, 3, 4, 5])) return "Weekdays";
  if (has([0, 6])) return "Weekends";

  // Monday first, Sunday last: how most people read a week.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => set.has(d as Weekday))
    .map((d) => SHORT_NAMES[d])
    .join(", ");
}
