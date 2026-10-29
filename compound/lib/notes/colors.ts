// Sticky-note paper: the colours a note can have, and a slight tilt per note.
// Class names are written out in full so Tailwind can find them.

export const NOTE_COLORS = ["yellow", "pink", "blue", "green", "orange"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const NOTE_PAPER: Record<NoteColor, { label: string; paper: string; swatch: string }> = {
  yellow: { label: "Yellow", paper: "bg-amber-100 border-amber-200/80", swatch: "bg-amber-200" },
  pink: { label: "Pink", paper: "bg-pink-100 border-pink-200/80", swatch: "bg-pink-200" },
  blue: { label: "Blue", paper: "bg-sky-100 border-sky-200/80", swatch: "bg-sky-200" },
  green: { label: "Green", paper: "bg-lime-100 border-lime-200/80", swatch: "bg-lime-200" },
  orange: { label: "Orange", paper: "bg-orange-100 border-orange-200/80", swatch: "bg-orange-200" },
};

const TILTS = ["-rotate-1", "rotate-[0.6deg]", "-rotate-[0.4deg]", "rotate-1", "rotate-0"] as const;

/** A small, fixed tilt for a note, taken from its id so it never jumps between renders. */
export function tiltFor(id: string): (typeof TILTS)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TILTS[hash % TILTS.length];
}
