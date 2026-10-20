"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * The browser's timezone, e.g. "Asia/Manila", or null while rendering on the
 * server (which has no way to know it). Using useSyncExternalStore with a
 * server value of null avoids a mismatch between server and browser HTML.
 */
export function useBrowserTimezone() {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}

type Props = {
  value: string | null; // null until the browser timezone is known
  onChange: (timezone: string) => void;
};

export function TimezoneSelect({ value, onChange }: Props) {
  if (!value) {
    return (
      <select disabled className="rounded-lg border border-foreground/20 bg-transparent px-3 py-2">
        <option>Detecting your timezone…</option>
      </select>
    );
  }

  // Some browsers report names that aren't in the official list (old aliases),
  // so make sure the current value is always an option.
  const zones = Intl.supportedValuesOf("timeZone");
  const options = zones.includes(value) ? zones : [value, ...zones];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Timezone"
      className="rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
    >
      {options.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
