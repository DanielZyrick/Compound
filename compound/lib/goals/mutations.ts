import "server-only";
import type { Transaction } from "kysely";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";

// Ownership lookups and the "is the goal done?" rule, shared by the goal
// page's actions and the Today card.

/** A step, with its milestone and goal, if it belongs to the user. */
export function findOwnedStep(userId: string, stepId: string) {
  return db
    .selectFrom("goal_steps")
    .innerJoin("goal_milestones", "goal_milestones.id", "goal_steps.milestone_id")
    .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
    .select(["goal_steps.id", "goal_steps.milestone_id", "goals.id as goalId", "goals.status"])
    .where("goal_steps.id", "=", stepId)
    .where("goals.user_id", "=", userId)
    .where("goals.status", "!=", "archived")
    .executeTakeFirst();
}

/** A milestone, with its goal, if it belongs to the user. */
export function findOwnedMilestone(userId: string, milestoneId: string) {
  return db
    .selectFrom("goal_milestones")
    .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
    .select(["goal_milestones.id", "goals.id as goalId"])
    .where("goal_milestones.id", "=", milestoneId)
    .where("goals.user_id", "=", userId)
    .where("goals.status", "!=", "archived")
    .executeTakeFirst();
}

/**
 * Marks the goal completed when every step is done, or active again when a
 * step is unticked. Runs inside the caller's transaction.
 */
export async function syncGoalStatus(trx: Transaction<Database>, goalId: string) {
  const open = await trx
    .selectFrom("goal_steps")
    .innerJoin("goal_milestones", "goal_milestones.id", "goal_steps.milestone_id")
    .select("goal_steps.id")
    .where("goal_milestones.goal_id", "=", goalId)
    .where("goal_steps.done_on", "is", null)
    .executeTakeFirst();

  if (open) {
    await trx
      .updateTable("goals")
      .set({ status: "active", completed_at: null })
      .where("id", "=", goalId)
      .where("status", "=", "completed")
      .execute();
  } else {
    await trx
      .updateTable("goals")
      .set({ status: "completed", completed_at: new Date() })
      .where("id", "=", goalId)
      .where("status", "=", "active")
      .execute();
  }
}
