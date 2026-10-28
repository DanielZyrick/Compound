import { z } from "zod";

export const MAX_STEPS_PER_MILESTONE = 12;

const stepTitle = z
  .string()
  .trim()
  .min(3, { error: "Describe the step in a few words." })
  .max(120, { error: "Keep steps under 120 characters." });

export const toggleStepSchema = z.object({ stepId: z.uuid(), done: z.boolean() });
export const addStepSchema = z.object({ milestoneId: z.uuid(), title: stepTitle });
export const renameStepSchema = z.object({ stepId: z.uuid(), title: stepTitle });
export const deleteStepSchema = z.object({ stepId: z.uuid() });
export const extendDeadlineSchema = z.object({ goalId: z.uuid(), deadline: z.iso.date({ error: "Choose a date." }) });
export const archiveGoalSchema = z.object({ goalId: z.uuid() });
