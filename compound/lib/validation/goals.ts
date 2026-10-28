import { z } from "zod";
import { daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";
import { parseAmount } from "@/lib/money/amount";

export const MAX_ACTIVE_GOALS = 5;
export const MIN_GOAL_DAYS = 3;
export const MAX_GOAL_DAYS = 730; // two years
export const BUFFER_PERCENT_OPTIONS = [0, 5, 10, 15, 20, 25, 30] as const;

export const newGoalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Give your goal a short name (at least 3 characters)." })
    .max(100, { error: "Keep the goal's name under 100 characters." }),
  why: z
    .string()
    .trim()
    .min(10, { error: "Say a little about why this matters to you (at least 10 characters)." })
    .max(500, { error: "Keep the reason under 500 characters." }),
  deadline: z.iso.date({ error: "Choose a deadline." }),
  bufferPercent: z
    .number()
    .refine((n) => (BUFFER_PERCENT_OPTIONS as readonly number[]).includes(n), { error: "Choose a buffer." }),
  target: savingsTarget().optional(),
});

/**
 * An optional savings target typed as money ("50,000"). Empty means no
 * target (null); anything else must be a valid amount, or it's an error, not
 * silently "no target".
 */
export function savingsTarget() {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === "") return null;
      const cents = parseAmount(text);
      if (cents === null) {
        ctx.issues.push({ code: "custom", message: "Enter a target like 50,000.", input: text });
        return z.NEVER;
      }
      return cents;
    });
}

export const setGoalTargetSchema = z.object({ goalId: z.uuid(), target: savingsTarget() });

export type NewGoalInput = z.input<typeof newGoalSchema>;

/**
 * Checks the deadline against the user's today (which only the server knows
 * for sure). Returns an error message, or null when it's fine.
 */
export function deadlineError(today: CalendarDate, deadline: CalendarDate): string | null {
  const days = daysBetween(today, deadline);
  if (days < MIN_GOAL_DAYS) return `Choose a deadline at least ${MIN_GOAL_DAYS} days from today.`;
  if (days > MAX_GOAL_DAYS) return "Choose a deadline within two years.";
  return null;
}
