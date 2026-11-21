import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { todayIn } from "@/lib/dates/calendar";
import { isValidTimezone } from "@/lib/dates/timezone";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { DEFAULT_CATEGORIES } from "@/lib/money/categories";
import { DEMO_HOURLY_CAP, DEMO_LIFETIME_HOURS, demoData } from "./data";

// "Try the demo": creates a throwaway account filled with sample data. Called
// by the demo sign-in provider in auth.ts. Demo users never call the AI or
// Google (see runAiTask and lib/calendar), and they're deleted after a day.

export const DEMO_EMAIL_DOMAIN = "demo.compound.local";

/** Too many demos were started in the last hour. */
export class DemoBusyError extends Error {}

/** A date as a timestamp at midday UTC, for "done at" columns seeded from a calendar date. */
const middayOf = (date: CalendarDate) => new Date(`${date}T12:00:00Z`);

/**
 * Deletes demo accounts older than their lifetime. Everything they own goes
 * with them; transactions first, as in deleteUserData (lib/account/queries.ts).
 */
export async function deleteExpiredDemoUsers() {
  await db.transaction().execute(async (trx) => {
    const expired = trx
      .selectFrom("users")
      .select("id")
      .where("is_demo", "=", true)
      .where("created_at", "<", sql<Date>`now() - ${`${DEMO_LIFETIME_HOURS} hours`}::interval`);
    await trx.deleteFrom("transactions").where("user_id", "in", expired).execute();
    await trx.deleteFrom("users").where("id", "in", expired).execute();
  });
}

/** Creates a demo user with sample data, in the visitor's timezone if it's a valid one. */
export async function createDemoUser(timezone: unknown): Promise<{ id: string; email: string; name: string }> {
  await deleteExpiredDemoUsers();

  const recent = await db
    .selectFrom("users")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("is_demo", "=", true)
    .where("created_at", ">", sql<Date>`now() - interval '1 hour'`)
    .executeTakeFirstOrThrow();
  if (Number(recent.count) >= DEMO_HOURLY_CAP) throw new DemoBusyError();

  const zone = typeof timezone === "string" && isValidTimezone(timezone) ? timezone : "UTC";
  const data = demoData(todayIn(zone));

  return db.transaction().execute(async (trx) => {
    const user = await trx
      .insertInto("users")
      .values({
        email: `demo-${randomUUID()}@${DEMO_EMAIL_DOMAIN}`,
        name: data.user.name,
        timezone: zone,
        onboarded_at: new Date(),
        is_demo: true,
      })
      .returning(["id", "email"])
      .executeTakeFirstOrThrow();
    const userId = user.id;

    await trx.insertInto("focus_areas").values({ user_id: userId, ...data.focus }).execute();
    await trx
      .insertInto("profiles")
      .values({
        user_id: userId,
        role: data.profile.role,
        improve: data.profile.improve,
        skills: data.profile.skills,
        interests: data.profile.interests,
        daily_minutes: data.profile.dailyMinutes,
      })
      .execute();

    // Habits, created three weeks ago so their history counts.
    const habitRows = await trx
      .insertInto("habits")
      .values(data.habits.map((h) => ({ user_id: userId, name: h.name, schedule: h.schedule })))
      .returning(["id", "name"])
      .execute();
    const habitId = (name: string) => habitRows.find((h) => h.name === name)!.id;
    await sql`update habits set created_at = now() - interval '21 days' where user_id = ${userId}`.execute(trx);
    await trx
      .insertInto("habit_checkins")
      .values(data.habits.flatMap((h) => h.checkins.map((date) => ({ habit_id: habitId(h.name), date }))))
      .execute();

    // The Python track: its plan, finished lessons and answers.
    const skill = data.skillTrack;
    const learnHabit = data.habits.find((h) => h.linkedToTrack)!;
    const skillTrack = await trx
      .insertInto("tracks")
      .values({
        user_id: userId,
        title: skill.title,
        topic: skill.topic,
        details: skill.details,
        type: "skill",
        level: skill.level,
        reading_plan: null,
        total_days: skill.days.length,
        start_date: skill.startDate,
        habit_id: habitId(learnHabit.name),
        plan_source: "demo",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const skillDays = await trx
      .insertInto("track_days")
      .values(
        skill.days.map((d) => ({
          track_id: skillTrack.id,
          day_number: d.day,
          title: d.title,
          summary: d.summary,
          completed_at: d.completedOn ? middayOf(d.completedOn) : null,
        })),
      )
      .returning(["id", "day_number"])
      .execute();
    const finished = skill.days.filter((d) => d.lesson);
    const lessons = await trx
      .insertInto("lessons")
      .values(
        finished.map((d) => ({
          track_day_id: skillDays.find((row) => row.day_number === d.day)!.id,
          content: JSON.stringify(d.lesson),
          source: "demo" as const,
        })),
      )
      .returning(["id", "track_day_id"])
      .execute();
    await trx
      .insertInto("attempts")
      .values(
        finished.flatMap((d) => {
          const dayId = skillDays.find((row) => row.day_number === d.day)!.id;
          const lessonId = lessons.find((l) => l.track_day_id === dayId)!.id;
          return d.lesson!.exercises.map((exercise, index) =>
            exercise.type === "multiple_choice"
              ? {
                  lesson_id: lessonId,
                  user_id: userId,
                  exercise_index: index,
                  answer: String(exercise.answerIndex),
                  is_correct: true,
                  feedback: exercise.explanation,
                  better_version: null,
                  source: "auto" as const,
                }
              : {
                  lesson_id: lessonId,
                  user_id: userId,
                  exercise_index: index,
                  answer: exercise.sampleAnswer,
                  is_correct: null, // demo answers aren't graded
                  feedback: "This is a demo account, so this answer wasn't sent to the AI for feedback.",
                  better_version: null,
                  source: "demo" as const,
                },
          );
        }),
      )
      .execute();

    // The reading track and its first reflection.
    const reading = data.readingTrack;
    const readingTrack = await trx
      .insertInto("tracks")
      .values({
        user_id: userId,
        title: reading.title,
        topic: reading.title,
        type: "reading",
        level: null,
        reading_plan: reading.planId,
        total_days: reading.days.length,
        start_date: reading.startDate,
        habit_id: null,
        plan_source: "fixed",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const readingDays = await trx
      .insertInto("track_days")
      .values(
        reading.days.map((d) => ({
          track_id: readingTrack.id,
          day_number: d.day,
          title: d.title,
          summary: d.summary,
          completed_at: d.completedOn ? middayOf(d.completedOn) : null,
        })),
      )
      .returning(["id", "day_number"])
      .execute();
    await trx
      .insertInto("reflections")
      .values({
        user_id: userId,
        track_day_id: readingDays.find((d) => d.day_number === reading.reflection.day)!.id,
        text: reading.reflection.text,
      })
      .execute();

    // The goal, its milestones and steps.
    const g = data.goal;
    const goal = await trx
      .insertInto("goals")
      .values({
        user_id: userId,
        title: g.title,
        why: g.why,
        details: g.details,
        start_date: g.startDate,
        deadline: g.deadline,
        buffer_days: g.bufferDays,
        plan_source: "demo",
        guide: JSON.stringify(g.guide),
        target_cents: g.targetCents,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const milestones = await trx
      .insertInto("goal_milestones")
      .values(
        g.milestones.map((m) => ({
          goal_id: goal.id,
          position: m.position,
          title: m.title,
          description: m.description,
          weight: m.weight,
          planned_due: m.plannedDue,
        })),
      )
      .returning(["id", "position"])
      .execute();
    await trx
      .insertInto("goal_steps")
      .values(
        g.milestones.flatMap((m) =>
          m.steps.map((s) => ({
            milestone_id: milestones.find((row) => row.position === m.position)!.id,
            position: s.position,
            title: s.title,
            done_on: s.doneOn,
          })),
        ),
      )
      .execute();

    // Money: the default categories (three with a budget), then the entries.
    const categories = await trx
      .insertInto("money_categories")
      .values(
        (["expense", "income"] as const).flatMap((kind) =>
          DEFAULT_CATEGORIES[kind].map((c, i) => ({
            user_id: userId,
            kind,
            name: c.name,
            icon: c.icon,
            position: i + 1,
            monthly_budget_cents: kind === "expense" ? (data.budgets[c.name] ?? null) : null,
          })),
        ),
      )
      .returning(["id", "kind", "name"])
      .execute();
    await trx
      .insertInto("transactions")
      .values(
        data.transactions.map((t) => ({
          user_id: userId,
          kind: t.kind,
          amount_cents: t.amountCents,
          category_id: categories.find((c) => c.kind === t.kind && c.name === t.category)!.id,
          note: t.note,
          occurred_on: t.occurredOn,
          goal_id: t.toGoal ? goal.id : null,
        })),
      )
      .execute();

    await trx
      .insertInto("notes")
      .values(
        data.notes.map((n) => ({
          user_id: userId,
          title: n.title,
          body: n.body,
          pinned: n.pinned,
          color: n.color,
          due_on: n.dueOn,
          done_at: n.doneOn ? middayOf(n.doneOn) : null,
        })),
      )
      .execute();

    const contacts = await trx
      .insertInto("contacts")
      .values(
        data.contacts.map((c) => ({
          user_id: userId,
          name: c.name,
          company: c.company,
          role: c.role,
          where_met: c.whereMet,
          email: c.email,
          notes: c.notes,
          follow_up_on: c.followUpOn,
          goal_id: c.linkedToGoal ? goal.id : null,
        })),
      )
      .returning(["id", "name"])
      .execute();
    await trx
      .insertInto("contact_touchpoints")
      .values(
        data.contacts.flatMap((c) =>
          c.touchpoints.map((t) => ({
            contact_id: contacts.find((row) => row.name === c.name)!.id,
            happened_on: t.happenedOn,
            note: t.note,
          })),
        ),
      )
      .execute();

    // A sample calendar: demo users see example events, never Google.
    await trx
      .insertInto("calendar_connections")
      .values({ user_id: userId, google_email: "demo@example.com", refresh_token: "demo" })
      .execute();

    return { id: userId, email: user.email, name: data.user.name };
  });
}
