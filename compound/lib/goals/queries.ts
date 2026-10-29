import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { CalendarDate, GoalStatus } from "@/lib/db/types";
import { guideSchema, type Guide } from "./plan";
import { scheduleGoal, type Schedule } from "./schedule";

export type GoalStep = { id: string; title: string; doneOn: CalendarDate | null };
export type GoalMilestone = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  weight: number;
  plannedDue: CalendarDate;
  steps: GoalStep[];
};
export type GoalWithSchedule = {
  id: string;
  title: string;
  why: string;
  startDate: CalendarDate;
  deadline: CalendarDate;
  bufferDays: number;
  status: GoalStatus;
  planSource: "ai" | "demo";
  /** Optional savings target and what's been put toward it, in cents. */
  targetCents: number | null;
  savedCents: number;
  milestones: GoalMilestone[];
  schedule: Schedule;
  /** The first unfinished step, in plan order. */
  nextStep: (GoalStep & { milestone: string }) | null;
};

/**
 * Loads goals with their milestones, steps and savings, and calculates each
 * goal's schedule as of `today`. Four queries in total, however many goals.
 */
async function loadGoals(userId: string, today: CalendarDate, goalId?: string): Promise<GoalWithSchedule[]> {
  let query = db
    .selectFrom("goals")
    .select(["id", "title", "why", "start_date", "deadline", "buffer_days", "status", "plan_source", "target_cents"])
    .where("user_id", "=", userId)
    .where("status", "!=", "archived")
    .orderBy("deadline");
  if (goalId) query = query.where("id", "=", goalId);
  const goals = await query.execute();
  if (goals.length === 0) return [];

  const [milestones, savings] = await Promise.all([
    db
      .selectFrom("goal_milestones")
      .select(["id", "goal_id", "position", "title", "description", "weight", "planned_due"])
      .where("goal_id", "in", goals.map((g) => g.id))
      .orderBy("position")
      .execute(),
    // Money put toward each goal: income transactions linked to it.
    db
      .selectFrom("transactions")
      .select(["goal_id", (eb) => eb.fn.sum<string>("amount_cents").as("saved")])
      .where("user_id", "=", userId)
      .where("goal_id", "in", goals.map((g) => g.id))
      .groupBy("goal_id")
      .execute(),
  ]);
  const savedByGoal = new Map(savings.map((r) => [r.goal_id, Number(r.saved)]));
  const steps = milestones.length
    ? await db
        .selectFrom("goal_steps")
        .select(["id", "milestone_id", "title", "done_on"])
        .where("milestone_id", "in", milestones.map((m) => m.id))
        .orderBy("position")
        .execute()
    : [];

  return goals.map((goal) => {
    const own: GoalMilestone[] = milestones
      .filter((m) => m.goal_id === goal.id)
      .map((m) => ({
        id: m.id,
        position: m.position,
        title: m.title,
        description: m.description,
        weight: m.weight,
        plannedDue: m.planned_due,
        steps: steps
          .filter((s) => s.milestone_id === m.id)
          .map((s) => ({ id: s.id, title: s.title, doneOn: s.done_on })),
      }));

    const schedule = scheduleGoal({
      startDate: goal.start_date,
      deadline: goal.deadline,
      bufferDays: goal.buffer_days,
      today,
      milestones: own.map((m) => ({
        id: m.id,
        weight: m.weight,
        plannedDue: m.plannedDue,
        stepsDone: m.steps.filter((s) => s.doneOn !== null).length,
        stepsTotal: m.steps.length,
      })),
    });

    const nextMilestone = own.find((m) => m.steps.some((s) => s.doneOn === null));
    const next = nextMilestone?.steps.find((s) => s.doneOn === null);

    return {
      id: goal.id,
      title: goal.title,
      why: goal.why,
      startDate: goal.start_date,
      deadline: goal.deadline,
      bufferDays: goal.buffer_days,
      status: goal.status,
      planSource: goal.plan_source,
      targetCents: goal.target_cents,
      savedCents: savedByGoal.get(goal.id) ?? 0,
      milestones: own,
      schedule,
      nextStep: next && nextMilestone ? { ...next, milestone: nextMilestone.title } : null,
    };
  });
}

/** All the user's active and completed goals, soonest deadline first. */
export function getGoals(userId: string, today: CalendarDate) {
  return loadGoals(userId, today);
}

/** One of the user's goals with its guide, or undefined if it isn't theirs. */
export async function getGoal(userId: string, goalId: string, today: CalendarDate) {
  const [goal] = await loadGoals(userId, today, goalId);
  if (!goal) return undefined;
  const row = await db.selectFrom("goals").select("guide").where("id", "=", goalId).executeTakeFirstOrThrow();
  const parsed = guideSchema.safeParse(row.guide);
  if (row.guide !== null && !parsed.success) {
    console.error("[goals] stored guide failed validation:", parsed.error.message);
  }
  return { ...goal, guide: parsed.success ? (parsed.data as Guide) : null };
}

export type NavGoal = { id: string; title: string; status: GoalWithSchedule["schedule"]["status"] };

/**
 * Active goals for the navigation, soonest deadline first. Cached per request:
 * the sidebar's goal list and the attention dots on both navs share one load.
 */
export const getNavGoals = cache(async (userId: string, today: CalendarDate): Promise<NavGoal[]> => {
  const goals = await loadGoals(userId, today);
  return goals.filter((g) => g.status === "active").map((g) => ({ id: g.id, title: g.title, status: g.schedule.status }));
});

/** How many goal steps the user has ticked off since `from` (their local date). */
export async function stepsDoneSince(userId: string, from: CalendarDate): Promise<number> {
  const row = await db
    .selectFrom("goal_steps")
    .innerJoin("goal_milestones", "goal_milestones.id", "goal_steps.milestone_id")
    .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("goals.user_id", "=", userId)
    .where("goals.status", "!=", "archived")
    .where("goal_steps.done_on", ">=", from)
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

/** Whether any active goal is behind or at risk: shows a dot on Goals in the nav. */
export async function goalsNeedAttention(userId: string, today: CalendarDate): Promise<boolean> {
  const goals = await getNavGoals(userId, today);
  return goals.some((g) => g.status === "behind" || g.status === "at_risk");
}

/** Active goals with a savings target, for "put toward a goal" on income. */
export function getSavingsGoals(userId: string) {
  return db
    .selectFrom("goals")
    .select(["id", "title"])
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .where("target_cents", "is not", null)
    .orderBy("deadline")
    .execute();
}
