import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import {
  change,
  habitDayStatus,
  reviewCardFor,
  reviewWeek,
  reviewWeekFor,
  upcoming,
  weekSentence,
  type ReviewHabit,
  type ReviewInput,
  type Totals,
  type UpcomingItem,
} from "./week";

// November 2026: the 16th is a Monday, the 22nd a Sunday.
const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];

function habit(overrides: Partial<Omit<ReviewHabit, "checkins">> & { checkins?: string[] } = {}): ReviewHabit {
  const { checkins = [], ...rest } = overrides;
  return {
    id: "h1",
    name: "Read 10 pages",
    schedule: EVERY_DAY,
    createdOn: "2026-11-01",
    archivedOn: null,
    ...rest,
    checkins: new Set(checkins),
  };
}

function input(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    monday: "2026-11-16",
    today: "2026-11-25",
    habits: [],
    lessons: [],
    steps: [],
    todos: [],
    touchpoints: [],
    expenses: [],
    ...overrides,
  };
}

const NO_TOTALS: Totals = {
  checkinsDone: 0,
  checkinsDue: 0,
  lessons: 0,
  readings: 0,
  steps: 0,
  todos: 0,
  contacts: 0,
  spentCents: 0,
};

describe("habitDayStatus", () => {
  const today = "2026-11-18"; // Wednesday

  it("marks a check-in as done, even on a day off", () => {
    expect(habitDayStatus(habit({ schedule: [1], checkins: ["2026-11-17"] }), "2026-11-17", today)).toBe("done");
  });

  it("tells a missed day from today, which isn't over yet", () => {
    expect(habitDayStatus(habit(), "2026-11-17", today)).toBe("missed");
    expect(habitDayStatus(habit(), today, today)).toBe("pending");
  });

  it("marks days after today as future, days before the habit as before", () => {
    expect(habitDayStatus(habit(), "2026-11-19", today)).toBe("future");
    expect(habitDayStatus(habit({ createdOn: "2026-11-17" }), "2026-11-16", today)).toBe("before");
  });

  it("marks unscheduled days and days after archiving as off", () => {
    expect(habitDayStatus(habit({ schedule: WEEKDAYS }), "2026-11-15", "2026-11-25")).toBe("off"); // a Sunday
    expect(habitDayStatus(habit({ archivedOn: "2026-11-17" }), "2026-11-17", today)).toBe("off");
  });
});

describe("reviewWeek", () => {
  it("counts a finished week against the whole week before", () => {
    const review = reviewWeek(
      input({
        habits: [habit({ checkins: ["2026-11-09", "2026-11-16", "2026-11-17", "2026-11-20"] })],
        steps: [
          { goalId: "g1", goalTitle: "Portfolio", title: "Draft the about page", doneOn: "2026-11-18" },
          { goalId: "g1", goalTitle: "Portfolio", title: "Pick a domain", doneOn: "2026-11-12" },
        ],
      }),
    );
    expect(review.daysElapsed).toBe(7);
    expect(review.isCurrentWeek).toBe(false);
    expect(review.totals).toMatchObject({ checkinsDone: 3, checkinsDue: 7, steps: 1 });
    expect(review.previous).toMatchObject({ checkinsDone: 1, checkinsDue: 7, steps: 1 });
    expect(review.activeDays).toBe(4); // Mon, Tue, Wed (the step) and Fri
    expect(review.habits[0]).toMatchObject({ done: 3, due: 7 });
  });

  it("compares a week in progress with the same days of last week", () => {
    const review = reviewWeek(
      input({
        today: "2026-11-18", // Wednesday
        lessons: [
          { trackId: "t1", trackTitle: "Python", trackType: "skill", dayNumber: 3, dayTitle: "Loops", doneOn: "2026-11-17" },
          // Last Tuesday counts; last Friday is after this point last week, so it doesn't.
          { trackId: "t1", trackTitle: "Python", trackType: "skill", dayNumber: 1, dayTitle: "Variables", doneOn: "2026-11-10" },
          { trackId: "t1", trackTitle: "Python", trackType: "skill", dayNumber: 2, dayTitle: "Strings", doneOn: "2026-11-13" },
        ],
      }),
    );
    expect(review.daysElapsed).toBe(3);
    expect(review.isCurrentWeek).toBe(true);
    expect(review.totals.lessons).toBe(1);
    expect(review.previous.lessons).toBe(1);
    expect(review.days.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
  });

  it("only counts today's check-in once it's done", () => {
    const review = reviewWeek(input({ today: "2026-11-18", habits: [habit({ checkins: ["2026-11-16"] })] }));
    // Mon done, Tue missed, Wed (today) not done yet: 1 of 2, not 1 of 3.
    expect(review.totals).toMatchObject({ checkinsDone: 1, checkinsDue: 2 });
    expect(review.habits[0].days.map((d) => d.status)).toEqual(["done", "missed", "pending", "future", "future", "future", "future"]);
  });

  it("handles a week that crosses into the next month", () => {
    const review = reviewWeek(
      input({
        monday: "2026-11-30",
        today: "2026-12-10",
        habits: [habit({ checkins: ["2026-11-30", "2026-12-06", "2026-12-07"] })],
      }),
    );
    expect(review.days.map((d) => d.date)).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
    expect(review.totals).toMatchObject({ checkinsDone: 2, checkinsDue: 7 });
  });

  it("doesn't count days before a habit was made", () => {
    const review = reviewWeek(input({ habits: [habit({ createdOn: "2026-11-19", schedule: WEEKDAYS, checkins: ["2026-11-19"] })] }));
    // Made on Thursday: Thu done, Fri missed, the weekend off.
    expect(review.habits[0]).toMatchObject({ done: 1, due: 2 });
    expect(review.habits[0].days.map((d) => d.status)).toEqual(["before", "before", "before", "done", "missed", "off", "off"]);
  });

  it("leaves out habits archived before the week and stops counting after archiving", () => {
    const review = reviewWeek(
      input({
        habits: [
          habit({ id: "old", archivedOn: "2026-11-10" }),
          habit({ id: "mid", archivedOn: "2026-11-18", checkins: ["2026-11-16"] }),
          habit({ id: "later", createdOn: "2026-11-23" }),
        ],
      }),
    );
    expect(review.habits.map((h) => h.id)).toEqual(["mid"]);
    expect(review.habits[0]).toMatchObject({ done: 1, due: 2 }); // Mon done, Tue missed, then archived
  });

  it("doesn't count spending as showing up, but adds it up by category", () => {
    const review = reviewWeek(
      input({
        expenses: [
          { categoryId: "food", categoryName: "Food", amountCents: 25000, occurredOn: "2026-11-16" },
          { categoryId: "travel", categoryName: "Transport", amountCents: 40000, occurredOn: "2026-11-17" },
          { categoryId: "food", categoryName: "Food", amountCents: 30000, occurredOn: "2026-11-21" },
          { categoryId: "food", categoryName: "Food", amountCents: 99900, occurredOn: "2026-11-23" }, // next week
        ],
      }),
    );
    expect(review.activeDays).toBe(0);
    expect(review.totals.spentCents).toBe(95000);
    expect(review.categories).toEqual([
      { categoryId: "food", name: "Food", cents: 55000 },
      { categoryId: "travel", name: "Transport", cents: 40000 },
    ]);
  });

  it("lists what got done this week, oldest first", () => {
    const review = reviewWeek(
      input({
        todos: [
          { id: "n2", title: "Pay rent", doneOn: "2026-11-20" },
          { id: "n1", title: "Call the bank", doneOn: "2026-11-17" },
          { id: "n0", title: "Last week's", doneOn: "2026-11-11" },
        ],
        touchpoints: [{ contactId: "c1", name: "Ana Reyes", happenedOn: "2026-11-19" }],
      }),
    );
    expect(review.done.todos.map((t) => t.title)).toEqual(["Call the bank", "Pay rent"]);
    expect(review.done.touchpoints).toHaveLength(1);
    expect(review.totals).toMatchObject({ todos: 2, contacts: 1 });
    expect(review.previous).toMatchObject({ todos: 1, contacts: 0 });
  });

  it("splits lessons from readings", () => {
    const review = reviewWeek(
      input({
        lessons: [
          { trackId: "t1", trackTitle: "Python", trackType: "skill", dayNumber: 1, dayTitle: "Variables", doneOn: "2026-11-16" },
          { trackId: "t2", trackTitle: "Decisions", trackType: "thinking", dayNumber: 1, dayTitle: "Trade-offs", doneOn: "2026-11-17" },
          { trackId: "t3", trackTitle: "Gospel of John", trackType: "reading", dayNumber: 1, dayTitle: "John 1", doneOn: "2026-11-17" },
        ],
      }),
    );
    expect(review.totals).toMatchObject({ lessons: 2, readings: 1 });
  });
});

describe("weekSentence", () => {
  const base = { activeDays: 5, daysElapsed: 7, isCurrentWeek: false, totals: NO_TOTALS };

  it("names the days and up to two highlights", () => {
    expect(weekSentence({ ...base, totals: { ...NO_TOTALS, steps: 3, lessons: 4, checkinsDone: 9 } })).toBe(
      "You showed up 5 of 7 days, finished 3 goal steps and did 4 lessons.",
    );
    expect(weekSentence({ ...base, totals: { ...NO_TOTALS, steps: 1 } })).toBe("You showed up 5 of 7 days, finished 1 goal step.");
  });

  it("says every day, and 'so far' for a week in progress", () => {
    expect(weekSentence({ ...base, activeDays: 7, totals: { ...NO_TOTALS, checkinsDone: 7 } })).toBe(
      "You showed up every day, checked in 7 times.",
    );
    expect(weekSentence({ ...base, activeDays: 3, daysElapsed: 3, isCurrentWeek: true })).toBe("You showed up every day so far.");
    expect(weekSentence({ ...base, activeDays: 2, daysElapsed: 4, isCurrentWeek: true })).toBe("You showed up 2 of 4 days so far.");
    expect(weekSentence({ ...base, activeDays: 1, daysElapsed: 1, isCurrentWeek: true })).toBe("You showed up today.");
  });

  it("is kind about an empty week", () => {
    expect(weekSentence({ ...base, activeDays: 0 })).toMatch(/^A quiet week/);
    expect(weekSentence({ ...base, activeDays: 0, isCurrentWeek: true, daysElapsed: 2 })).toMatch(/^Nothing logged yet this week/);
  });
});

describe("change", () => {
  it("gives the direction and size of a change", () => {
    expect(change(5, 3)).toEqual({ direction: "up", amount: 2 });
    expect(change(1, 4)).toEqual({ direction: "down", amount: 3 });
    expect(change(2, 2)).toEqual({ direction: "same", amount: 0 });
  });
});

describe("reviewWeekFor", () => {
  const joined = "2026-10-01";

  it("opens this week, or last week on a Monday", () => {
    expect(reviewWeekFor(undefined, "2026-11-19", joined)).toBe("2026-11-16");
    expect(reviewWeekFor(undefined, "2026-11-23", joined)).toBe("2026-11-16");
  });

  it("opens the week containing a given date", () => {
    expect(reviewWeekFor("2026-11-12", "2026-11-19", joined)).toBe("2026-11-09");
  });

  it("never goes past this week or before the first week", () => {
    expect(reviewWeekFor("2027-01-01", "2026-11-19", joined)).toBe("2026-11-16");
    expect(reviewWeekFor("2026-01-01", "2026-11-19", joined)).toBe("2026-09-28");
    // Joined on a Monday: there is no last week to open.
    expect(reviewWeekFor(undefined, "2026-11-23", "2026-11-23")).toBe("2026-11-23");
  });

  it("ignores a value that isn't a date", () => {
    expect(reviewWeekFor("next", "2026-11-19", joined)).toBe("2026-11-16");
    expect(reviewWeekFor("2026-13-45", "2026-11-19", joined)).toBe("2026-11-16");
  });
});

describe("reviewCardFor", () => {
  it("looks back on this week on a Sunday and last week on a Monday", () => {
    expect(reviewCardFor("2026-11-22")).toEqual({ week: "2026-11-16", title: "Your week so far" });
    expect(reviewCardFor("2026-11-23")).toEqual({ week: "2026-11-16", title: "Last week, looking back" });
  });

  it("shows no card the rest of the week", () => {
    for (const day of ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]) {
      expect(reviewCardFor(day)).toBeNull();
    }
  });
});

describe("upcoming", () => {
  it("keeps the next 7 days, soonest first", () => {
    const item = (title: string, due: string): UpcomingItem => ({ kind: "todo", title, detail: null, href: "/notes", due });
    const items = [item("in a week", "2026-11-26"), item("today", "2026-11-19"), item("tomorrow", "2026-11-20"), item("too far", "2026-11-27")];
    expect(upcoming(items, "2026-11-19").map((i) => i.title)).toEqual(["tomorrow", "in a week"]);
  });
});
