import { z } from "zod";
import { TRACK_LEVELS } from "@/lib/db/types";
import { TRACK_LENGTHS } from "@/lib/tracks/plan";

export const MAX_ACTIVE_TRACKS = 5;

export const newTrackSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, { error: "Tell us what you want to learn (at least 3 characters)." })
    .max(120, { error: "Keep the topic under 120 characters." }),
  // Reading tracks (fixed reading plans) come later; they never use AI text.
  type: z.enum(["skill", "thinking"], { error: "Choose a track type." }),
  level: z.enum(TRACK_LEVELS, { error: "Choose your level." }),
  totalDays: z
    .number()
    .refine((n) => (TRACK_LENGTHS as readonly number[]).includes(n), { error: "Choose a length." }),
  addHabit: z.boolean(),
});

export type NewTrackInput = z.input<typeof newTrackSchema>;
