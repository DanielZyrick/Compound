import type { Goal } from "@/lib/db/types";

export const GOAL_LABELS: Record<Goal, string> = {
  career: "Career",
  business: "Business",
  faith: "Faith",
  health: "Health",
  custom: "Custom",
};

// A one-line explanation under each focus type in onboarding.
export const GOAL_HINTS: Record<Goal, string> = {
  career: "Skills, promotions, a new job",
  business: "Start or grow a business",
  faith: "Scripture, prayer, spiritual growth",
  health: "Fitness, sleep, nutrition",
  custom: "Something else",
};

// Example descriptions, shown as the placeholder for the chosen focus.
export const DESCRIPTION_EXAMPLES: Record<Goal, string> = {
  career: "e.g. Get promoted to senior developer within a year by getting better at system design.",
  business: "e.g. Launch my online bakery and reach 50 paying customers in 6 months.",
  faith: "e.g. Read the whole Bible this year and build a daily habit of prayer.",
  health: "e.g. Lose 8 kg and run a 5K without stopping by December.",
  custom: "e.g. Play five songs on the guitar well enough to perform for friends.",
};

// Habit ideas shown during onboarding for the chosen focus.
export const HABIT_SUGGESTIONS: Record<Goal, string[]> = {
  career: ["Learn something new for 20 minutes", "Plan tomorrow's top 3 tasks"],
  business: ["Review your numbers", "Reach out to one customer or lead"],
  faith: ["Read the Bible", "Pray", "Write down one thing you're grateful for"],
  health: ["Walk 20 minutes", "Drink 8 glasses of water", "Sleep by 11 pm"],
  custom: ["Practice for 15 minutes"],
};
