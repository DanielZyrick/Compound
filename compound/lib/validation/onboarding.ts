import { z } from "zod";
import { isValidTimezone } from "@/lib/dates/timezone";
import type { Weekday } from "@/lib/db/types";

export const MAX_HABITS = 5;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 500;

// Each step of the onboarding form validates its own part with one of these
// schemas before moving on; the server action validates the whole thing again.

const descriptionSchema = z
  .string()
  .trim()
  .min(DESCRIPTION_MIN, {
    error: `Tell us a little more about what you want to achieve (at least ${DESCRIPTION_MIN} characters).`,
  })
  .max(DESCRIPTION_MAX, { error: `Keep your description under ${DESCRIPTION_MAX} characters.` });

export const focusSchema = z.discriminatedUnion(
  "goal",
  [
    z.object({
      goal: z.enum(["career", "business", "faith", "health"]),
      description: descriptionSchema,
    }),
    z.object({
      goal: z.literal("custom"),
      customLabel: z
        .string()
        .trim()
        .min(1, { error: "Give your custom focus a name." })
        .max(50, { error: "Keep the name under 50 characters." }),
      description: descriptionSchema,
    }),
  ],
  { error: "Choose what you want to work on." },
);

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

export const habitsSchema = z
  .array(habitSchema)
  .min(1, { error: "Add at least one habit." })
  .max(MAX_HABITS, { error: `Add at most ${MAX_HABITS} habits.` })
  .refine((habits) => new Set(habits.map((h) => h.name.toLowerCase())).size === habits.length, {
    error: "Habit names must be different from each other.",
  });

export const timezoneSchema = z
  .string()
  .refine(isValidTimezone, { error: "Choose a valid timezone." });

export const onboardingSchema = z.object({
  focus: focusSchema,
  habits: habitsSchema,
  timezone: timezoneSchema,
});

export type FocusInput = z.input<typeof focusSchema>;
export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingData = z.output<typeof onboardingSchema>;
