import "server-only";
import { addDays, todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { getGoals } from "@/lib/goals/queries";
import { weekStart } from "@/lib/habits/week";
import { firstWeek, reviewWeek, reviewWeekFor, upcoming, type UpcomingItem } from "./week";

type User = { id: string; timezone: string; created_at: Date };

/**
 * Timestamps can't be compared with calendar dates directly: a lesson
 * finished late on Sunday in Manila is Sunday afternoon in UTC. So timestamp
 * columns are loaded with a day to spare on each side and turned into the
 * user's local date here.
 */
function padded(from: CalendarDate, to: CalendarDate) {
  return { after: new Date(`${addDays(from, -1)}T00:00:00Z`), before: new Date(`${addDays(to, 2)}T00:00:00Z`) };
}

/**
 * Everything the Week in review page shows for the week a ?week= value
 * opens: that week and the one before it (to compare), in the same few
 * queries however much there is, plus what's coming up when it's a recent week.
 */
export async function getWeekReview(user: User, weekParam: unknown) {
  const today = todayIn(user.timezone);
  const local = (date: Date) => todayIn(user.timezone, date);

  // Every habit, archived ones too: a habit archived last week still belongs in last week.
  const habitRows = await db
    .selectFrom("habits")
    .select(["id", "name", "schedule", "created_at", "archived_at"])
    .where("user_id", "=", user.id)
    .orderBy("created_at")
    .execute();

  // Demo accounts are made today with weeks of history, so the first week
  // also looks at the oldest habit, not just the sign-up date.
  const firstDay = habitRows.reduce((first, h) => (local(h.created_at) < first ? local(h.created_at) : first), local(user.created_at));
  const monday = reviewWeekFor(weekParam, today, firstDay);
  const from = addDays(monday, -7);
  const to = addDays(monday, 6);
  const { after, before } = padded(from, to);
  // "Coming up" belongs on this week and last week (which opens on Mondays), not on old weeks.
  const recent = monday >= addDays(weekStart(today), -7);

  const [checkins, lessons, steps, todos, touchpoints, expenses, upcomingItems] = await Promise.all([
    habitRows.length
      ? db
          .selectFrom("habit_checkins")
          .select(["habit_id", "date"])
          .where("habit_id", "in", habitRows.map((h) => h.id))
          .where("date", ">=", from)
          .where("date", "<=", to)
          .execute()
      : [],
    db
      .selectFrom("track_days")
      .innerJoin("tracks", "tracks.id", "track_days.track_id")
      .select(["tracks.id as trackId", "tracks.title as trackTitle", "tracks.type as trackType", "track_days.day_number", "track_days.title", "track_days.completed_at"])
      .where("tracks.user_id", "=", user.id)
      .where("track_days.completed_at", ">", after)
      .where("track_days.completed_at", "<", before)
      .execute(),
    db
      .selectFrom("goal_steps")
      .innerJoin("goal_milestones", "goal_milestones.id", "goal_steps.milestone_id")
      .innerJoin("goals", "goals.id", "goal_milestones.goal_id")
      .select(["goals.id as goalId", "goals.title as goalTitle", "goal_steps.title", "goal_steps.done_on"])
      .where("goals.user_id", "=", user.id)
      .where("goals.status", "!=", "archived")
      .where("goal_steps.done_on", ">=", from)
      .where("goal_steps.done_on", "<=", to)
      .execute(),
    db
      .selectFrom("notes")
      .select(["id", "title", "done_at"])
      .where("user_id", "=", user.id)
      .where("done_at", ">", after)
      .where("done_at", "<", before)
      .execute(),
    db
      .selectFrom("contact_touchpoints")
      .innerJoin("contacts", "contacts.id", "contact_touchpoints.contact_id")
      .select(["contacts.id as contactId", "contacts.name", "contact_touchpoints.happened_on"])
      .where("contacts.user_id", "=", user.id)
      .where("contact_touchpoints.happened_on", ">=", from)
      .where("contact_touchpoints.happened_on", "<=", to)
      .execute(),
    db
      .selectFrom("transactions")
      .innerJoin("money_categories", "money_categories.id", "transactions.category_id")
      .select(["transactions.category_id", "money_categories.name", "transactions.amount_cents", "transactions.occurred_on"])
      .where("transactions.user_id", "=", user.id)
      .where("transactions.kind", "=", "expense")
      .where("transactions.occurred_on", ">=", from)
      .where("transactions.occurred_on", "<=", to)
      .execute(),
    recent ? getUpcoming(user.id, today) : Promise.resolve([]),
  ]);

  const review = reviewWeek({
    monday,
    today,
    habits: habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      schedule: h.schedule,
      createdOn: local(h.created_at),
      archivedOn: h.archived_at ? local(h.archived_at) : null,
      checkins: new Set(checkins.filter((c) => c.habit_id === h.id).map((c) => c.date)),
    })),
    lessons: lessons.map((l) => ({
      trackId: l.trackId,
      trackTitle: l.trackTitle,
      trackType: l.trackType,
      dayNumber: l.day_number,
      dayTitle: l.title,
      doneOn: local(l.completed_at!),
    })),
    steps: steps.map((s) => ({ goalId: s.goalId, goalTitle: s.goalTitle, title: s.title, doneOn: s.done_on! })),
    todos: todos.map((t) => ({ id: t.id, title: t.title, doneOn: local(t.done_at!) })),
    touchpoints: touchpoints.map((t) => ({ contactId: t.contactId, name: t.name, happenedOn: t.happened_on })),
    expenses: expenses.map((e) => ({
      categoryId: e.category_id,
      categoryName: e.name,
      amountCents: e.amount_cents,
      occurredOn: e.occurred_on,
    })),
  });

  return {
    review,
    today,
    earliest: firstWeek(today, firstDay),
    upcoming: upcoming(upcomingItems, today),
  };
}

/** Milestones, to-dos and follow-ups due in the next 7 days. */
async function getUpcoming(userId: string, today: CalendarDate): Promise<UpcomingItem[]> {
  const last = addDays(today, 7);
  const [goals, notes, contacts] = await Promise.all([
    getGoals(userId, today),
    db
      .selectFrom("notes")
      .select(["id", "title", "due_on"])
      .where("user_id", "=", userId)
      .where("done_at", "is", null)
      .where("due_on", ">", today)
      .where("due_on", "<=", last)
      .execute(),
    db
      .selectFrom("contacts")
      .select(["id", "name", "follow_up_on"])
      .where("user_id", "=", userId)
      .where("follow_up_on", ">", today)
      .where("follow_up_on", "<=", last)
      .execute(),
  ]);

  const milestones = goals
    .filter((g) => g.status === "active")
    .flatMap((goal) =>
      goal.milestones.flatMap((m) => {
        const due = goal.schedule.milestones.find((s) => s.id === m.id)?.adjustedDue;
        return due ? [{ kind: "milestone" as const, title: m.title, detail: goal.title, href: `/goals/${goal.id}`, due }] : [];
      }),
    );
  return [
    ...milestones,
    ...notes.map((n) => ({ kind: "todo" as const, title: n.title, detail: null, href: "/notes", due: n.due_on! })),
    ...contacts.map((c) => ({ kind: "follow-up" as const, title: c.name, detail: null, href: `/contacts/${c.id}`, due: c.follow_up_on! })),
  ];
}
