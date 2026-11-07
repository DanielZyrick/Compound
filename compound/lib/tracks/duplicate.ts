import type { TrackType } from "@/lib/db/types";

// One active track per topic: the same topic and type twice is almost always
// a double click while the AI was drafting, not something anyone wants.

/** A topic as compared: case, extra spaces and a trailing full stop don't matter. */
export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");
}

/** The active track on the same topic and type, if there is one. */
export function findDuplicate<T extends { topic: string; type: TrackType }>(
  active: T[],
  request: { topic: string; type: TrackType },
): T | undefined {
  const topic = normalizeTopic(request.topic);
  return active.find((t) => t.type === request.type && normalizeTopic(t.topic) === topic);
}
