// Money amounts are whole cents (integers) everywhere: in the database, in
// calculations and in props. Only these helpers convert to and from text,
// so there are no floating-point totals like 0.30000000000000004.

/** Currencies with two decimal places that users can choose. */
export const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const MAX_AMOUNT_CENTS = 1_000_000_000; // 10,000,000.00

/**
 * Turns what a person types into cents: "185", "1,250.50", "₱99", "99.9".
 * Returns null for anything that isn't a positive amount with at most two
 * decimals, or that's above the maximum.
 */
export function parseAmount(input: string): number | null {
  // Drop currency symbols, spaces and thousands separators.
  const cleaned = input.trim().replace(/[₱$€£\s]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

/** "₱1,250.50" for 125050 cents in PHP. */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

/** The plain number for an input field: 125050 → "1250.50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
