import type { Goal, ProfilesTable } from "@/lib/db/types";
import { GOAL_LABELS } from "@/lib/onboarding/goals";

// What the AI is told about the person: their focus areas from onboarding and
// their "About you" answers, as a few plain lines. Pure, so it's easy to test.
// Prompts put this inside tags and treat it only as a description.

export type ContextFocus = { goal: Goal; custom_label: string | null; description: string | null };

export type ContextProfile = Pick<ProfilesTable, "role" | "improve" | "skills" | "interests" | "daily_minutes">;

/** True when none of the "About you" questions has an answer yet. */
export function isProfileEmpty(profile: ContextProfile | null | undefined): boolean {
  return !profile || (!profile.role && !profile.improve && !profile.skills && !profile.interests && !profile.daily_minutes);
}

/** A few lines about the person, or null when there's nothing to say. */
export function learnerContext(focusAreas: ContextFocus[], profile: ContextProfile | null | undefined): string | null {
  const lines = focusAreas.map((f) => {
    const label = f.custom_label ?? GOAL_LABELS[f.goal];
    return f.description ? `Focus (${label}): ${f.description}` : `Focus: ${label}`;
  });
  if (profile) {
    if (profile.role) lines.push(`What they do: ${profile.role}`);
    if (profile.improve) lines.push(`Wants to get better at: ${profile.improve}`);
    if (profile.skills) lines.push(`Already knows: ${profile.skills}`);
    if (profile.interests) lines.push(`Interests: ${profile.interests}`);
    if (profile.daily_minutes) lines.push(`Time for learning: about ${profile.daily_minutes} minutes a day`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}
