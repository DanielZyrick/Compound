import "server-only";
import { db } from "@/lib/db";
import { disconnect } from "@/lib/calendar/google";

// "Download my data" and "Delete my account" (Settings → Your data).

/**
 * Everything the user owns, as raw rows for buildExport (lib/account/export.ts).
 * Columns are listed one by one so secrets (the encrypted Google Calendar
 * tokens) can never slip into the file, even if a table gains a column.
 */
export async function loadExportRows(userId: string) {
  const [
    user,
    focusAreas,
    profile,
    habits,
    checkins,
    tracks,
    trackDays,
    lessons,
    attempts,
    reflections,
    principles,
    goals,
    milestones,
    steps,
    categories,
    transactions,
    notes,
    contacts,
    touchpoints,
    calendar,
    aiCalls,
  ] = await Promise.all([
    db
      .selectFrom("users")
      .select(["email", "name", "timezone", "currency", "created_at", "onboarded_at"])
      .where("id", "=", userId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("focus_areas")
      .select(["goal", "custom_label", "description", "created_at"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("profiles")
      .select(["role", "improve", "skills", "interests", "daily_minutes", "updated_at"])
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("habits")
      .select(["id", "name", "schedule", "created_at", "archived_at"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("habit_checkins")
      .innerJoin("habits", "habits.id", "habit_checkins.habit_id")
      .select(["habit_checkins.habit_id", "habit_checkins.date"])
      .where("habits.user_id", "=", userId)
      .orderBy("habit_checkins.date")
      .execute(),
    db
      .selectFrom("tracks")
      .select([
        "id",
        "title",
        "topic",
        "details",
        "type",
        "level",
        "reading_plan",
        "total_days",
        "start_date",
        "status",
        "created_at",
      ])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("track_days")
      .innerJoin("tracks", "tracks.id", "track_days.track_id")
      .select([
        "track_days.id",
        "track_days.track_id",
        "track_days.day_number",
        "track_days.title",
        "track_days.summary",
        "track_days.completed_at",
      ])
      .where("tracks.user_id", "=", userId)
      .orderBy("track_days.day_number")
      .execute(),
    db
      .selectFrom("lessons")
      .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
      .innerJoin("tracks", "tracks.id", "track_days.track_id")
      .select(["lessons.id", "lessons.track_day_id", "lessons.content", "lessons.created_at"])
      .where("tracks.user_id", "=", userId)
      .execute(),
    db
      .selectFrom("attempts")
      .select(["lesson_id", "exercise_index", "answer", "is_correct", "feedback", "better_version", "created_at"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("reflections")
      .select(["track_day_id", "text", "created_at", "updated_at"])
      .where("user_id", "=", userId)
      .execute(),
    db
      .selectFrom("daily_principles")
      .select(["date", "content", "reflection"])
      .where("user_id", "=", userId)
      .orderBy("date")
      .execute(),
    db
      .selectFrom("goals")
      .select([
        "id",
        "title",
        "why",
        "details",
        "start_date",
        "deadline",
        "buffer_days",
        "status",
        "target_cents",
        "guide",
        "created_at",
        "completed_at",
      ])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("goal_milestones")
      .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
      .select([
        "goal_milestones.id",
        "goal_milestones.goal_id",
        "goal_milestones.position",
        "goal_milestones.title",
        "goal_milestones.description",
        "goal_milestones.weight",
        "goal_milestones.planned_due",
      ])
      .where("goals.user_id", "=", userId)
      .orderBy("goal_milestones.position")
      .execute(),
    db
      .selectFrom("goal_steps")
      .innerJoin("goal_milestones", "goal_milestones.id", "goal_steps.milestone_id")
      .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
      .select(["goal_steps.milestone_id", "goal_steps.position", "goal_steps.title", "goal_steps.done_on"])
      .where("goals.user_id", "=", userId)
      .orderBy("goal_steps.position")
      .execute(),
    db
      .selectFrom("money_categories")
      .select(["id", "kind", "name", "monthly_budget_cents", "archived_at"])
      .where("user_id", "=", userId)
      .orderBy("kind")
      .orderBy("position")
      .execute(),
    db
      .selectFrom("transactions")
      .select(["kind", "amount_cents", "category_id", "note", "occurred_on", "goal_id", "created_at"])
      .where("user_id", "=", userId)
      .orderBy("occurred_on")
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("notes")
      .select(["title", "body", "pinned", "color", "done_at", "due_on", "created_at", "updated_at"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("contacts")
      .select([
        "id",
        "name",
        "company",
        "role",
        "where_met",
        "email",
        "phone",
        "linkedin",
        "notes",
        "follow_up_on",
        "goal_id",
        "created_at",
      ])
      .where("user_id", "=", userId)
      .orderBy("name")
      .execute(),
    db
      .selectFrom("contact_touchpoints")
      .innerJoin("contacts", "contacts.id", "contact_touchpoints.contact_id")
      .select(["contact_touchpoints.contact_id", "contact_touchpoints.happened_on", "contact_touchpoints.note"])
      .where("contacts.user_id", "=", userId)
      .orderBy("contact_touchpoints.happened_on")
      .execute(),
    // Only who it's connected as: never the tokens.
    db
      .selectFrom("calendar_connections")
      .select(["google_email", "connected_at"])
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("ai_calls")
      .select(["day", "purpose", "model", "ok", "input_tokens", "output_tokens", "created_at"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
  ]);

  return {
    user,
    focusAreas,
    profile: profile ?? null,
    habits,
    checkins,
    tracks,
    trackDays,
    lessons,
    attempts,
    reflections,
    principles,
    goals,
    milestones,
    steps,
    categories,
    transactions,
    notes,
    contacts,
    touchpoints,
    calendar: calendar ?? null,
    aiCalls,
  };
}

export type ExportRows = Awaited<ReturnType<typeof loadExportRows>>;

/**
 * Deletes a user and everything they own, in one database transaction.
 * Transactions go first: transactions.category_id is `on delete restrict`,
 * so the cascade from users must not reach a category while it still has
 * transactions. Everything else cascades from the users row.
 */
export async function deleteUserData(userId: string) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("transactions").where("user_id", "=", userId).execute();
    await trx.deleteFrom("users").where("id", "=", userId).execute();
  });
}

/**
 * "Delete my account": revokes Google Calendar access at Google first (the
 * stored token is needed for that), then deletes all the user's data.
 */
export async function deleteAccount(user: { id: string; is_demo: boolean }) {
  await disconnect(user);
  await deleteUserData(user.id);
}
