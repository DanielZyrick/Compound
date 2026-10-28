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

// Styled to match the shadcn Input. A native select keeps 400+ timezones
// searchable by typing and works well on phones.
const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

type Props = {
  value: string | null; // null until the browser timezone is known
  onChange: (timezone: string) => void;
};

export function TimezoneSelect({ value, onChange }: Props) {
  if (!value) {
    return (
      <select disabled className={SELECT_CLASS}>
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
      id="timezone"
      className={SELECT_CLASS}
    >
      {options.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
