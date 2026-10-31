import { z } from "zod";
import { DAILY_MINUTES } from "@/lib/db/types";

export const PROFILE_LIMITS = { role: 120, improve: 300, skills: 300, interests: 300 } as const;

/** Optional text: trimmed, with an empty answer saved as null. */
function answer(max: number, what: string) {
  return z
    .string()
    .trim()
    .max(max, { error: `Keep ${what} under ${max} characters.` })
    .optional()
    .transform((text) => (text ? text : null));
}

/** The "About you" form. Every field is optional. */
export const profileSchema = z.object({
  role: answer(PROFILE_LIMITS.role, "what you do"),
  improve: answer(PROFILE_LIMITS.improve, "what you want to get better at"),
  skills: answer(PROFILE_LIMITS.skills, "your skills"),
  interests: answer(PROFILE_LIMITS.interests, "your interests"),
  dailyMinutes: z
    .literal(DAILY_MINUTES, { error: "Choose how much time you have a day." })
    .nullable()
    .optional()
    .transform((m) => m ?? null),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileAnswers = z.output<typeof profileSchema>;
