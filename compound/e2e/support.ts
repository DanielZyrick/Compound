import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { createDb } from "../lib/db/create-db";
import { addDays, todayIn } from "../lib/dates/calendar";
import type { Weekday } from "../lib/db/types";
import { plannedDueDates } from "../lib/goals/schedule";

// Shared helpers for the end-to-end tests. Every test works with one
// dedicated test user, which is deleted and recreated as needed, so tests
// never see each other's data or anyone else's.

try {
  process.loadEnvFile(".env.local");
} catch {
  // CI: the environment is provided directly.
}

export const TEST_EMAIL = "e2e-test@compound.local";
const TEST_TIMEZONE = "Asia/Manila";

/**
 * The dev database, or an error. The tests create and delete rows, so they
 * refuse to run unless DATABASE_URL points at the host named in E2E_DB_HOST.
 */
function devDb() {
  const url = process.env.DATABASE_URL;
  const allowed = process.env.E2E_DB_HOST;
  if (!url || !allowed) throw new Error("Set DATABASE_URL and E2E_DB_HOST (the dev branch host) in .env.local.");
  const host = new URL(url).hostname;
  if (host !== allowed) {
    throw new Error(`Refusing to run end-to-end tests against ${host}: it isn't E2E_DB_HOST (${allowed}).`);
  }
  return createDb(url);
}

export const db = devDb();

/**
 * Opens a page and waits until it's interactive. Buttons are in the HTML
 * before React has hydrated them, and a click that early does nothing.
 */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/**
 * The app's own alert messages. Next.js also adds an empty, hidden
 * role="alert" element that announces route changes to screen readers.
 */
export function alerts(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/** Deletes the test user and everything they own (every table cascades from users). */
export async function deleteTestUser() {
  await db.deleteFrom("users").where("email", "=", TEST_EMAIL).execute();
}

type UserSetup = {
  onboarded?: boolean;
  habits?: { name: string; schedule?: Weekday[] }[];
};

/**
 * Starts a test from a clean slate: recreates the test user (onboarded or
 * not, with optional habits) and signs the browser in as them.
 */
export async function signInFreshUser(context: BrowserContext, { onboarded = true, habits = [] }: UserSetup = {}) {
  await deleteTestUser();
  const user = await db
    .insertInto("users")
    .values({
      email: TEST_EMAIL,
      name: "E2E Tester",
      timezone: TEST_TIMEZONE,
      onboarded_at: onboarded ? new Date() : null,
    })
    .returning(["id", "email", "name"])
    .executeTakeFirstOrThrow();

  if (onboarded) {
    await db
      .insertInto("focus_areas")
      .values({ user_id: user.id, goal: "career", description: "Become a better software developer this year." })
      .execute();
  }
  if (habits.length > 0) {
    await db
      .insertInto("habits")
      .values(habits.map((h) => ({ user_id: user.id, name: h.name, schedule: h.schedule ?? [0, 1, 2, 3, 4, 5, 6] })))
      .execute();
  }

  // The same encrypted session cookie Auth.js sets after a GitHub sign-in.
  const salt = "authjs.session-token";
  const value = await encode({
    token: { name: user.name, email: user.email, userId: user.id },
    secret: process.env.AUTH_SECRET!,
    salt,
  });
  const baseURL = `http://localhost:3100`;
  await context.addCookies([{ name: salt, value, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
  return user;
}

/**
 * Inserts a goal for the test user without the AI, e.g. one that started
 * weeks ago so it's already at risk. Offsets are days from the user's today.
 */
export async function seedGoal(
  userId: string,
  {
    title,
    startOffset,
    deadlineOffset,
    bufferDays,
    milestones,
  }: { title: string; startOffset: number; deadlineOffset: number; bufferDays: number; milestones: { title: string; steps: string[] }[] },
) {
  const today = todayIn(TEST_TIMEZONE);
  const start = addDays(today, startOffset);
  const deadline = addDays(today, deadlineOffset);
  const dues = plannedDueDates(start, addDays(deadline, -bufferDays), milestones.map(() => 1));

  const goal = await db
    .insertInto("goals")
    .values({ user_id: userId, title, why: "A test goal.", start_date: start, deadline, buffer_days: bufferDays, plan_source: "demo", guide: null })
    .returning("id")
    .executeTakeFirstOrThrow();
  for (const [i, m] of milestones.entries()) {
    const row = await db
      .insertInto("goal_milestones")
      .values({ goal_id: goal.id, position: i + 1, title: m.title, weight: 1, planned_due: dues[i] })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("goal_steps")
      .values(m.steps.map((s, j) => ({ milestone_id: row.id, position: j + 1, title: s })))
      .execute();
  }
  return { id: goal.id, today };
}
