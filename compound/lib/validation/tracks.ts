import { z } from "zod";
import { TRACK_LEVELS } from "@/lib/db/types";
import { READING_PLAN_IDS } from "@/lib/reading/plans";
import { TRACK_LENGTHS } from "@/lib/tracks/plan";

export const MAX_ACTIVE_TRACKS = 5;

// Skill and thinking tracks: the AI writes a plan for the learner's topic.
const aiTrackSchema = z.object({
  type: z.enum(["skill", "thinking"]),
  topic: z
    .string()
    .trim()
    .min(3, { error: "Tell us what you want to learn (at least 3 characters)." })
    .max(120, { error: "Keep the topic under 120 characters." }),
  level: z.enum(TRACK_LEVELS, { error: "Choose your level." }),
  totalDays: z
    .number({ error: "Choose a length." })
    .refine((n) => (TRACK_LENGTHS as readonly number[]).includes(n), { error: "Choose a length." }),
  addHabit: z.boolean(),
});

// Reading tracks: a fixed plan from the code. No AI is involved.
const readingTrackSchema = z.object({
  type: z.literal("reading"),
  readingPlan: z.enum(READING_PLAN_IDS, { error: "Choose a reading plan." }),
  addHabit: z.boolean(),
});

export const newTrackSchema = z.discriminatedUnion("type", [aiTrackSchema, readingTrackSchema], {
  error: "Choose a track type.",
});

export type NewTrackInput = z.input<typeof newTrackSchema>;
