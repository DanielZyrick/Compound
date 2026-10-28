import { z } from "zod";
import { daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";
import { parseAmount } from "@/lib/money/amount";

/**
 * A transaction from the quick-add form or an edit. The amount arrives as
 * the text the person typed and leaves as integer cents.
 */
export const transactionSchema = z.object({
  id: z.uuid().optional(), // present when editing
  kind: z.enum(["expense", "income"]),
  amount: z
    .string()
    .transform((text) => parseAmount(text))
    .refine((cents): cents is number => cents !== null, {
      error: "Enter an amount like 185 or 1,250.50 (up to 10,000,000).",
    }),
  categoryId: z.uuid({ error: "Choose a category." }),
  note: z
    .string()
    .trim()
    .max(200, { error: "Keep the note under 200 characters." })
    .transform((note) => (note === "" ? null : note)),
  occurredOn: z.iso.date({ error: "Choose a date." }),
});

export type TransactionInput = z.input<typeof transactionSchema>;

/** Dates are the user's own days: no future, and not more than five years back. */
export function occurredOnError(today: CalendarDate, date: CalendarDate): string | null {
  if (date > today) return "The date can't be in the future.";
  if (daysBetween(date, today) > 5 * 366) return "Choose a date within the last five years.";
  return null;
}

export const deleteTransactionSchema = z.object({ id: z.uuid() });
