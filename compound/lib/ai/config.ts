import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiError } from "./errors";

// Server-only: the API key never reaches the browser. Model names come from
// the environment so they can change without a code change.

/** AI calls each user can make per day (in their timezone). */
export const DAILY_AI_LIMIT = 20;

/** Smart: plan generation and other quality-sensitive work. Fast: quick feedback. */
export type ModelTier = "smart" | "fast";

export function modelFor(tier: ModelTier): string {
  const name = tier === "smart" ? "MODEL_SMART" : "MODEL_FAST";
  const model = process.env[name];
  if (!model) throw new AiError("not_configured", `${name} is not set`);
  return model;
}

/**
 * Demo mode: AI features use built-in example output instead of calling
 * Claude. It's on when no API key is configured (so the app runs, and can be
 * shown, for free) or when AI_DEMO_MODE=1 (the end-to-end tests set this so
 * they never spend API credits).
 */
export function isDemoMode(): boolean {
  return process.env.AI_DEMO_MODE === "1" || !process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | undefined;

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError("not_configured", "ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
}
