import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, TrackType, Weekday } from "@/lib/db/types";
import { weekStart } from "@/lib/habits/week";

// Week in review: one Monday-to-Sunday week across the whole app, compared
// with the week before. Pure functions over plain rows, so every rule here is
// unit tested; lib/review/queries.ts loads the rows.

export type ReviewHabit = {
  id: string;
  name: string;
  schedule: Weekday[];
  createdOn: CalendarDate; // the user's local date
  archivedOn: CalendarDate | null; // the user's local date, or null while active
  checkins: ReadonlySet<CalendarDate>;
};
export type ReviewLesson = {
  trackId: string;
  trackTitle: string;
  trackType: TrackType;
  dayNumber: number;
  dayTitle: string;
  doneOn: CalendarDate;
};
export type ReviewStep = { goalId: string; goalTitle: string; title: string; doneOn: CalendarDate };
export type ReviewTodo = { id: string; title: string; doneOn: CalendarDate };
export type ReviewTouchpoint = { contactId: string; name: string; happenedOn: CalendarDate };
export type ReviewExpense = { categoryId: string; categoryName: string; amountCents: number; occurredOn: CalendarDate };

export type ReviewInput = {
  monday: CalendarDate; // the week under review
  today: CalendarDate;
  // Rows may cover more than the two weeks; anything outside them is ignored.
  habits: ReviewHabit[];
  lessons: ReviewLesson[];
  steps: ReviewStep[];
  todos: ReviewTodo[];
  touchpoints: ReviewTouchpoint[];
  expenses: ReviewExpense[];
};

/** One square on a habit's week. "future" is a day that hasn't come yet. */
export type HabitDayStatus = "done" | "missed" | "pending" | "off" | "before" | "future";

export type Totals = {
  checkinsDone: number;
  checkinsDue: number;
  lessons: number;
  readings: number;
  steps: number;
  todos: number;
  contacts: number;
  spentCents: number;
};

export type WeekReview = {
  monday: CalendarDate;
  /** Days of the week that have started: 7 for a past week, 1 to 7 for this one. */
  daysElapsed: number;
  isCurrentWeek: boolean;
  /** Each day, Monday first: whether the user did anything that day. */
  days: { date: CalendarDate; active: boolean; future: boolean }[];
  activeDays: number;
  /** This week so far, and the same days of the week before, for a fair comparison. */
  totals: Totals;
  previous: Totals;
  habits: { id: string; name: string; days: { date: CalendarDate; status: HabitDayStatus }[]; done: number; due: number }[];
  done: { steps: ReviewStep[]; lessons: ReviewLesson[]; todos: ReviewTodo[]; touchpoints: ReviewTouchpoint[] };
  /** Spending by category, biggest first. */
  categories: { categoryId: string; name: string; cents: number }[];
  sentence: string;
};

const inRange = (date: CalendarDate, from: CalendarDate, to: CalendarDate) => date >= from && date <= to;
const byDate = <T>(dateOf: (row: T) => CalendarDate) => (a: T, b: T) => dateOf(a).localeCompare(dateOf(b));

/** How a habit's day looks, as of `today`. Days after it was archived count as off. */
export function habitDayStatus(habit: ReviewHabit, date: CalendarDate, today: CalendarDate): HabitDayStatus {
  if (date > today) return "future";
  if (habit.checkins.has(date)) return "done";
  if (date < habit.createdOn) return "before";
  if (habit.archivedOn && date >= habit.archivedOn) return "off";
  if (!habit.schedule.includes(weekdayOf(date))) return "off";
  return date === today ? "pending" : "missed";
}

/** Done and due check-ins for one habit between two dates. Today counts as due only once it's done. */
function habitCounts(habit: ReviewHabit, from: CalendarDate, to: CalendarDate, today: CalendarDate) {
  let done = 0;
  let missed = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const status = habitDayStatus(habit, date, today);
    if (status === "done") done += 1;
    if (status === "missed") missed += 1;
  }
  return { done, due: done + missed };
}

function totalsFor(input: ReviewInput, from: CalendarDate, to: CalendarDate): Totals {
  const habits = input.habits.map((h) => habitCounts(h, from, to, input.today));
  const lessons = input.lessons.filter((l) => inRange(l.doneOn, from, to));
  return {
    checkinsDone: habits.reduce((sum, h) => sum + h.done, 0),
    checkinsDue: habits.reduce((sum, h) => sum + h.due, 0),
    lessons: lessons.filter((l) => l.trackType !== "reading").length,
    readings: lessons.filter((l) => l.trackType === "reading").length,
    steps: input.steps.filter((s) => inRange(s.doneOn, from, to)).length,
    todos: input.todos.filter((t) => inRange(t.doneOn, from, to)).length,
    contacts: input.touchpoints.filter((t) => inRange(t.happenedOn, from, to)).length,
    spentCents: input.expenses.filter((e) => inRange(e.occurredOn, from, to)).reduce((sum, e) => sum + e.amountCents, 0),
  };
}

/** Days the user did something that moves them forward. Recording spending doesn't count. */
function activeDates(input: ReviewInput): Set<CalendarDate> {
  return new Set([
    ...input.habits.flatMap((h) => [...h.checkins]),
    ...input.lessons.map((l) => l.doneOn),
    ...input.steps.map((s) => s.doneOn),
    ...input.todos.map((t) => t.doneOn),
    ...input.touchpoints.map((t) => t.happenedOn),
  ]);
}

export function reviewWeek(input: ReviewInput): WeekReview {
  const { monday, today } = input;
  const sunday = addDays(monday, 6);
  const isCurrentWeek = weekStart(today) === monday;
  // A future week has nothing to review; treat it as not started.
  const daysElapsed = today > sunday ? 7 : today < monday ? 0 : weekdayIndex(today) + 1;
  const end = addDays(monday, Math.max(daysElapsed, 1) - 1);

  const active = activeDates(input);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, active: date <= today && active.has(date), future: date > today };
  });
  const activeDays = days.filter((d) => d.active).length;

  // Habits that existed at some point this week: made by Sunday, archived after Monday or not at all.
  const habits = input.habits
    .filter((h) => h.createdOn <= sunday && (h.archivedOn === null || h.archivedOn > monday))
    .map((h) => ({
      id: h.id,
      name: h.name,
      days: days.map((d) => ({ date: d.date, status: habitDayStatus(h, d.date, today) })),
      ...habitCounts(h, monday, sunday, today),
    }));

  const week = <T>(rows: T[], dateOf: (row: T) => CalendarDate) =>
    rows.filter((row) => inRange(dateOf(row), monday, sunday)).sort(byDate(dateOf));

  const byCategory = new Map<string, { categoryId: string; name: string; cents: number }>();
  for (const e of week(input.expenses, (e) => e.occurredOn)) {
    const entry = byCategory.get(e.categoryId) ?? { categoryId: e.categoryId, name: e.categoryName, cents: 0 };
    entry.cents += e.amountCents;
    byCategory.set(e.categoryId, entry);
  }

  const totals = totalsFor(input, monday, end);
  const review: Omit<WeekReview, "sentence"> = {
    monday,
    daysElapsed,
    isCurrentWeek,
    days,
    activeDays,
    totals,
    previous: totalsFor(input, addDays(monday, -7), addDays(end, -7)),
    habits,
    done: {
      steps: week(input.steps, (s) => s.doneOn),
      lessons: week(input.lessons, (l) => l.doneOn),
      todos: week(input.todos, (t) => t.doneOn),
      touchpoints: week(input.touchpoints, (t) => t.happenedOn),
    },
    categories: [...byCategory.values()].sort((a, b) => b.cents - a.cents),
  };
  return { ...review, sentence: weekSentence(review) };
}

/** 0 = Monday ... 6 = Sunday. */
function weekdayIndex(date: CalendarDate): number {
  return (weekdayOf(date) + 6) % 7;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "a, b and c" */
function listOf(parts: string[]): string {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * One plain sentence about the week, e.g. "You showed up 5 of 7 days,
 * finished 3 goal steps and did 4 lessons." Written by code, not the AI.
 */
export function weekSentence(review: Pick<WeekReview, "activeDays" | "daysElapsed" | "isCurrentWeek" | "totals">): string {
  const { activeDays, daysElapsed, isCurrentWeek, totals } = review;
  if (activeDays === 0) {
    return isCurrentWeek
      ? "Nothing logged yet this week. One small step today gets it started."
      : "A quiet week. Small steps still count, and every week is a fresh start.";
  }

  const highlights = [
    totals.steps > 0 && `finished ${count(totals.steps, "goal step", "goal steps")}`,
    totals.lessons > 0 && `did ${count(totals.lessons, "lesson", "lessons")}`,
    totals.readings > 0 && `read ${count(totals.readings, "day of your plan", "days of your plan")}`,
    totals.checkinsDone > 0 && `checked in ${count(totals.checkinsDone, "time", "times")}`,
    totals.todos > 0 && `ticked off ${count(totals.todos, "to-do", "to-dos")}`,
    totals.contacts > 0 && `kept in touch with ${count(totals.contacts, "person", "people")}`,
  ].filter((part): part is string => typeof part === "string");

  const soFar = isCurrentWeek && daysElapsed < 7 ? " so far" : "";
  const days =
    daysElapsed === 1
      ? "today"
      : activeDays === daysElapsed
        ? `every day${soFar}`
        : `${activeDays} of ${daysElapsed} days${soFar}`;
  return `You showed up ${days}${highlights.length > 0 ? `, ${listOf(highlights.slice(0, 2))}` : ""}.`;
}

/** The change from last week, for a tile: "+2", "−1" or "same". */
export function change(now: number, before: number): { direction: "up" | "down" | "same"; amount: number } {
  if (now === before) return { direction: "same", amount: 0 };
  return { direction: now > before ? "up" : "down", amount: Math.abs(now - before) };
}

/** The Monday of the user's first week: the earliest week there is to review. */
export function firstWeek(today: CalendarDate, firstDay: CalendarDate): CalendarDate {
  return weekStart(firstDay < today ? firstDay : today);
}

/**
 * Which week a ?week= value opens: the week containing that date, kept
 * between the user's first week and this week. With no value it opens this
 * week, except on Mondays, when this week has barely started and last week
 * is the one worth looking back on.
 */
export function reviewWeekFor(param: unknown, today: CalendarDate, firstDay: CalendarDate): CalendarDate {
  const current = weekStart(today);
  const earliest = firstWeek(today, firstDay);
  const valid = typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param) && !Number.isNaN(Date.parse(param));
  const wanted = valid ? weekStart(param) : weekdayOf(today) === 1 ? addDays(current, -7) : current;
  if (wanted > current) return current;
  if (wanted < earliest) return earliest;
  return wanted;
}

export type UpcomingItem = { kind: "milestone" | "todo" | "follow-up"; title: string; detail: string | null; href: string; due: CalendarDate };

/** What's due in the 7 days after today, soonest first. */
export function upcoming(items: UpcomingItem[], today: CalendarDate): UpcomingItem[] {
  const last = addDays(today, 7);
  return items.filter((item) => item.due > today && item.due <= last).sort(byDate((item) => item.due));
}
