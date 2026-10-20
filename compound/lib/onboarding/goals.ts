import type { Goal } from "@/lib/db/types";

export const GOAL_LABELS: Record<Goal, string> = {
  career: "Career",
  business: "Business",
  faith: "Faith",
  health: "Health",
  custom: "Custom",
};

// Habit ideas shown during onboarding for each chosen goal.
export const HABIT_SUGGESTIONS: Record<Goal, string[]> = {
  career: ["Learn something new for 20 minutes", "Plan tomorrow's top 3 tasks"],
  business: ["Review your numbers", "Reach out to one customer or lead"],
  faith: ["Read the Bible", "Pray", "Write down one thing you're grateful for"],
  health: ["Walk 20 minutes", "Drink 8 glasses of water", "Sleep by 11 pm"],
  custom: ["Practice for 15 minutes"],
};
