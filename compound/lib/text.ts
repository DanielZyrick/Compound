/**
 * Shortens text to at most `max` characters, cutting at a word boundary and
 * ending with "…", so names never stop mid-word ("for data a").
 */
export function shorten(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1); // leave room for the ellipsis
  const lastSpace = cut.lastIndexOf(" ");
  // A single very long word has no boundary to cut at; cut it as is.
  const words = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${words.replace(/[\s,;:.\-–—]+$/, "")}…`;
}
