"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { daysBetween, todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { findOwnedMilestone, findOwnedStep, syncGoalStatus } from "@/lib/goals/mutations";
import {
  addStepSchema,
  archiveGoalSchema,
  deleteStepSchema,
  extendDeadlineSchema,
  MAX_STEPS_PER_MILESTONE,
  renameStepSchema,
  toggleStepSchema,
} from "@/lib/validation/goal-steps";
import { MAX_GOAL_DAYS, setGoalTargetSchema } from "@/lib/validation/goals";

// Actions for the goal page and the Today card. Each checks that the goal
// belongs to the signed-in user before changing anything.

export type GoalActionResult = { errors: string[] };

const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";
const messages = (issues: { message: string }[]) => [...new Set(issues.map((i) => i.message))];

/** Ticks a step off (dated with the user's local "today") or unticks it. */
export async function toggleStep(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = toggleStepSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { stepId, done } = parsed.data;

  const step = await findOwnedStep(user.id, stepId);
  if (!step) return { errors: [SOMETHING_WRONG] };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("goal_steps")
      .set({ done_on: done ? todayIn(user.timezone) : null })
      .where("id", "=", stepId)
      .execute();
    await syncGoalStatus(trx, step.goalId);
  });

  refresh();
  return { errors: [] };
}

export async function addStep(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = addStepSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { milestoneId, title } = parsed.data;

  const milestone = await findOwnedMilestone(user.id, milestoneId);
  if (!milestone) return { errors: [SOMETHING_WRONG] };

  const existing = await db
    .selectFrom("goal_steps")
    .select((eb) => eb.fn.max("position").as("last"))
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("milestone_id", "=", milestoneId)
    .executeTakeFirstOrThrow();
  if (Number(existing.count) >= MAX_STEPS_PER_MILESTONE) {
    return { errors: [`A milestone can have up to ${MAX_STEPS_PER_MILESTONE} steps.`] };
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("goal_steps")
      .values({ milestone_id: milestoneId, position: (existing.last ?? 0) + 1, title })
      .execute();
    // A new open step means a completed goal isn't complete any more.
    await syncGoalStatus(trx, milestone.goalId);
  });

  refresh();
  return { errors: [] };
}

export async function renameStep(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = renameStepSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { stepId, title } = parsed.data;

  if (!(await findOwnedStep(user.id, stepId))) return { errors: [SOMETHING_WRONG] };
  await db.updateTable("goal_steps").set({ title }).where("id", "=", stepId).execute();

  refresh();
  return { errors: [] };
}

export async function deleteStep(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = deleteStepSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  const step = await findOwnedStep(user.id, parsed.data.stepId);
  if (!step) return { errors: [SOMETHING_WRONG] };

  const siblings = await db
    .selectFrom("goal_steps")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("milestone_id", "=", step.milestone_id)
    .executeTakeFirstOrThrow();
  if (Number(siblings.count) <= 1) return { errors: ["A milestone needs at least one step."] };

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("goal_steps").where("id", "=", step.id).execute();
    // Removing the last open step can finish the goal.
    await syncGoalStatus(trx, step.goalId);
  });

  refresh();
  return { errors: [] };
}

/**
 * Moves the deadline later (the answer to "at risk"). The buffer keeps its
 * length, so the planned work end moves too; adjusted dates recalculate.
 */
export async function extendDeadline(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = extendDeadlineSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { goalId, deadline } = parsed.data;

  const goal = await db
    .selectFrom("goals")
    .select(["deadline", "start_date"])
    .where("id", "=", goalId)
    .where("user_id", "=", user.id)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!goal) return { errors: [SOMETHING_WRONG] };

  const today = todayIn(user.timezone);
  if (deadline <= goal.deadline) return { errors: ["Choose a date after the current deadline."] };
  if (deadline <= today) return { errors: ["Choose a date in the future."] };
  if (daysBetween(today, deadline) > MAX_GOAL_DAYS) return { errors: ["Choose a deadline within two years."] };

  await db.updateTable("goals").set({ deadline }).where("id", "=", goalId).execute();
  refresh();
  return { errors: [] };
}

/** Hides a goal from the lists. Its data stays in the database. */
export async function archiveGoal(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = archiveGoalSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  await db
    .updateTable("goals")
    .set({ status: "archived" })
    .where("id", "=", parsed.data.goalId)
    .where("user_id", "=", user.id)
    .execute();
  // A redirect after a change must refresh the target, or the browser may
  // show its cached copy of the list (still including this goal).
  revalidatePath("/goals");
  redirect("/goals");
}

/** Sets, changes or (with an empty field) removes a goal's savings target. */
export async function setGoalTarget(input: unknown): Promise<GoalActionResult> {
  const user = await requireOnboardedUser();
  const parsed = setGoalTargetSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  const updated = await db
    .updateTable("goals")
    .set({ target_cents: parsed.data.target })
    .where("id", "=", parsed.data.goalId)
    .where("user_id", "=", user.id)
    .where("status", "!=", "archived")
    .executeTakeFirst();
  if (updated.numUpdatedRows === BigInt(0)) return { errors: [SOMETHING_WRONG] };

  refresh();
  return { errors: [] };
}
