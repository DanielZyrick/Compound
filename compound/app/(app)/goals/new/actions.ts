"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { daysBetween, todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { demoGoalPlan, GOAL_SYSTEM_PROMPT, goalPlanSchema, goalPrompt } from "@/lib/goals/plan";
import { bufferDaysFor, plannedDueDates, workEndFor } from "@/lib/goals/schedule";
import { GOAL_LABELS } from "@/lib/onboarding/goals";
import { deadlineError, MAX_ACTIVE_GOALS, newGoalSchema } from "@/lib/validation/goals";

export type CreateGoalState = { errors: string[] };

/**
 * Creates a goal: the AI (or demo mode) drafts milestones, steps and an
 * execution guide; the scheduling engine sets the buffer and planned dates;
 * everything is saved in one transaction.
 */
export async function createGoal(_previous: CreateGoalState, input: unknown): Promise<CreateGoalState> {
  const user = await requireOnboardedUser();

  const parsed = newGoalSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { title, why, deadline, bufferPercent } = parsed.data;

  // "Today" comes from the user's timezone on the server, not from the browser.
  const today = todayIn(user.timezone);
  const dateProblem = deadlineError(today, deadline);
  if (dateProblem) return { errors: [dateProblem] };

  const [active, focus] = await Promise.all([
    db.selectFrom("goals").select("id").where("user_id", "=", user.id).where("status", "=", "active").execute(),
    db
      .selectFrom("focus_areas")
      .select(["goal", "custom_label", "description"])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
  ]);
  if (active.length >= MAX_ACTIVE_GOALS) {
    return { errors: [`You can have up to ${MAX_ACTIVE_GOALS} active goals. Finish or archive one first.`] };
  }

  const bufferDays = bufferDaysFor(today, deadline, bufferPercent);
  const workEnd = workEndFor(deadline, bufferDays);
  const focusText = focus
    ? `${focus.custom_label ?? GOAL_LABELS[focus.goal]}${focus.description ? `: ${focus.description}` : ""}`
    : null;

  let plan;
  let source;
  try {
    ({ data: plan, source } = await runAiTask({
      user,
      purpose: "goal_plan",
      tier: "smart",
      schema: goalPlanSchema,
      system: GOAL_SYSTEM_PROMPT,
      prompt: goalPrompt({ title, why, days: daysBetween(today, workEnd) + 1, focus: focusText }),
      demo: () => demoGoalPlan(title),
    }));
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  const dueDates = plannedDueDates(today, workEnd, plan.milestones.map((m) => m.weight));

  const goalId = await db.transaction().execute(async (trx) => {
    const goal = await trx
      .insertInto("goals")
      .values({
        user_id: user.id,
        title,
        why,
        start_date: today,
        deadline,
        buffer_days: bufferDays,
        plan_source: source,
        guide: JSON.stringify(plan.guide),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    // One insert for all milestones and one for all steps, rather than one per
    // row: each round trip to the database adds noticeable latency.
    const milestoneRows = await trx
      .insertInto("goal_milestones")
      .values(
        plan.milestones.map((milestone, index) => ({
          goal_id: goal.id,
          position: index + 1,
          title: milestone.title,
          description: milestone.description,
          weight: milestone.weight,
          planned_due: dueDates[index],
        })),
      )
      .returning(["id", "position"])
      .execute();
    // Match steps to milestones by position (RETURNING doesn't promise an order).
    const idByPosition = new Map(milestoneRows.map((m) => [m.position, m.id]));
    await trx
      .insertInto("goal_steps")
      .values(
        plan.milestones.flatMap((milestone, index) =>
          milestone.steps.map((step, i) => ({
            milestone_id: idByPosition.get(index + 1)!,
            position: i + 1,
            title: step,
          })),
        ),
      )
      .execute();
    return goal.id;
  });

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect(`/goals/${goalId}`);
}
