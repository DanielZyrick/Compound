/** The hour (0–23) right now in a timezone. */
export function hourIn(timezone: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour) % 24;
}

/** "Good morning" before noon, "Good afternoon" until 6 pm, then "Good evening". Night owls get evening. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The first word of a name, for "Good morning, Alex". Null when there's no name. */
export function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}
