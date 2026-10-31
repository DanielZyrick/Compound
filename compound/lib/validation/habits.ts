import { z } from "zod";
import type { Weekday } from "@/lib/db/types";

// Keeps the Today list short enough to actually do. Enforced by the server
// when adding or restoring a habit.
export const MAX_ACTIVE_HABITS = 12;

// Weekdays: 0 = Sunday ... 6 = Saturday. Duplicates are removed and the
// list is sorted, so [5, 1, 1] is saved as [1, 5].
export const scheduleSchema = z
  .array(z.int().min(0).max(6))
  .min(1, { error: "Pick at least one day for each habit." })
  .transform((days) => [...new Set(days)].sort((a, b) => a - b) as Weekday[]);

export const habitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Every habit needs a name." })
    .max(60, { error: "Keep habit names under 60 characters." }),
  schedule: scheduleSchema,
});

/** Adding a habit (no id) or editing one (with its id). */
export const saveHabitSchema = habitSchema.extend({ id: z.uuid().optional() });

export const setArchivedSchema = z.object({ id: z.uuid(), archived: z.boolean() });

/** Checking a habit off (or not) for a past day. */
export const setPastCheckinSchema = z.object({ habitId: z.uuid(), date: z.iso.date(), done: z.boolean() });

export type HabitInput = z.input<typeof habitSchema>;
