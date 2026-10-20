import { z } from "zod";
import { isValidTimezone } from "@/lib/dates/timezone";
import type { Weekday } from "@/lib/db/types";

export const MAX_GOALS = 5;
export const MAX_HABITS = 5;

const fixedGoalSchema = z.object({
  goal: z.enum(["career", "business", "faith", "health"]),
});

const customGoalSchema = z.object({
  goal: z.literal("custom"),
  customLabel: z
    .string()
    .trim()
    .min(1, { error: "Give your custom goal a name." })
    .max(50, { error: "Keep your custom goal under 50 characters." }),
});

const goalSchema = z.union([fixedGoalSchema, customGoalSchema]);

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

export const onboardingSchema = z.object({
  goals: z
    .array(goalSchema)
    .min(1, { error: "Choose at least one goal." })
    .max(MAX_GOALS, { error: `Choose at most ${MAX_GOALS} goals.` })
    .refine((goals) => new Set(goals.map((g) => g.goal)).size === goals.length, {
      error: "Each goal can only be chosen once.",
    }),
  habits: z
    .array(habitSchema)
    .min(1, { error: "Add at least one habit." })
    .max(MAX_HABITS, { error: `Add at most ${MAX_HABITS} habits.` })
    .refine(
      (habits) => new Set(habits.map((h) => h.name.toLowerCase())).size === habits.length,
      { error: "Habit names must be different from each other." },
    ),
  timezone: z.string().refine(isValidTimezone, { error: "Choose a valid timezone." }),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingData = z.output<typeof onboardingSchema>;
