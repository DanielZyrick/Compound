// The biggest free block left in today, so Compound can say "you're free
// 2:00 PM – 4:00 PM". Pure, so it's easy to test.

/** Free time only counts in waking hours: 8 AM to 9 PM. */
export const FREE_FROM_MIN = 8 * 60;
export const FREE_TO_MIN = 21 * 60;
/** Shorter gaps aren't worth pointing out. */
export const MIN_FREE_MINUTES = 30;

export type FreeGap = { startMin: number; endMin: number };

/** Minutes since local midnight in a timezone, right now. */
export function minutesNowIn(timezone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
    .formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return get("hour") * 60 + get("minute");
}

/** "2:41 PM", from minutes since midnight. */
export function clockLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = String(minutes % 60).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * The longest free block between now and 9 PM, given today's timed events
 * (minutes since midnight; overlaps are fine). Starts no earlier than 8 AM
 * and on a 5-minute mark. Null on a day without events, or when no gap of at
 * least 30 minutes is left. The earlier gap wins a tie.
 */
export function biggestFreeGap(busy: { startMin: number; endMin: number }[], nowMin: number): FreeGap | null {
  if (busy.length === 0) return null;
  const from = Math.max(FREE_FROM_MIN, Math.ceil(nowMin / 5) * 5);

  let best: FreeGap | null = null;
  const consider = (startMin: number, endMin: number) => {
    const length = endMin - startMin;
    if (length >= MIN_FREE_MINUTES && (!best || length > best.endMin - best.startMin)) best = { startMin, endMin };
  };

  let cursor = from;
  for (const event of [...busy].sort((a, b) => a.startMin - b.startMin)) {
    if (event.startMin >= FREE_TO_MIN) break;
    if (event.startMin > cursor) consider(cursor, event.startMin);
    cursor = Math.max(cursor, event.endMin);
  }
  if (cursor < FREE_TO_MIN) consider(cursor, FREE_TO_MIN);
  return best;
}
