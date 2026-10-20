/** True if `timezone` is an IANA timezone name the runtime knows, e.g. "Asia/Manila". */
export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
