import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates/calendar";
import { currentStreak } from "@/lib/habits/streaks";
import { goalPlanSchema } from "@/lib/goals/plan";
import { scheduleGoal } from "@/lib/goals/schedule";
import { lessonSchema } from "@/lib/lessons/schema";
import { collectMistakes } from "@/lib/mistakes/collect";
import { DEFAULT_CATEGORIES } from "@/lib/money/categories";
import { demoData } from "./data";

// A few "todays", including month and year boundaries and a leap day.
const TODAYS = ["2026-11-19", "2026-03-01", "2027-01-01", "2028-02-29"];

describe.each(TODAYS)("demoData on %s", (today) => {
  const data = demoData(today);
  const yesterday = addDays(today, -1);

  it("only puts check-ins in the past three weeks, never today", () => {
    for (const habit of data.habits) {
      for (const date of habit.checkins) {
        expect(date < today).toBe(true);
        expect(date >= addDays(today, -21)).toBe(true);
      }
    }
  });

  it("gives the habits live streaks, so Today and Habits look used", () => {
    const streak = (name: string) => {
      const habit = data.habits.find((h) => h.name.startsWith(name))!;
      return currentStreak({ schedule: habit.schedule, checkins: habit.checkins, today });
    };
    expect(streak("Read 10 pages")).toBe(8);
    expect(streak("Go to the gym")).toBeGreaterThan(0);
    expect(streak("Learn:")).toBe(4);
  });

  it("has finished the Python track's first four days, one a day up to yesterday, with valid lessons", () => {
    const done = data.skillTrack.days.filter((d) => d.completedOn);
    expect(done.map((d) => d.day)).toEqual([1, 2, 3, 4]);
    expect(done.at(-1)!.completedOn).toBe(yesterday);
    for (const day of done) expect(lessonSchema("skill").safeParse(day.lesson).success).toBe(true);
    // Day 5 opens today, and the linked habit was ticked by those lessons.
    expect(data.skillTrack.days[4]).toMatchObject({ day: 5, completedOn: null, lesson: null });
    const learn = data.habits.find((h) => h.linkedToTrack)!;
    expect(learn.checkins).toEqual(done.map((d) => d.completedOn));
  });

  it("got two multiple-choice questions wrong, so Mistakes to review has something to show", () => {
    const done = data.skillTrack.days.filter((d) => d.lesson);
    const days = done.map((d) => ({ lessonId: `lesson-${d.day}`, dayNumber: d.day, dayTitle: d.title, lesson: d.lesson! }));
    // The same answers lib/demo/create.ts saves for multiple choice.
    const attempts = done.flatMap((d) =>
      d.lesson!.exercises.flatMap((exercise, index) =>
        exercise.type === "multiple_choice"
          ? [
              {
                dayNumber: d.day,
                exerciseIndex: index,
                answer: String(d.missed?.exercise === index ? d.missed.choice : exercise.answerIndex),
                isCorrect: d.missed?.exercise !== index,
                feedback: exercise.explanation,
                betterVersion: null,
              },
            ]
          : [],
      ),
    );
    expect(collectMistakes(days, attempts).map((m) => [m.dayNumber, m.exerciseIndex])).toEqual([
      [4, 0],
      [2, 1],
    ]);
  });

  it("has a goal plan that passes the AI schema and is on track", () => {
    const { goal } = data;
    const plan = {
      milestones: goal.milestones.map((m) => ({ ...m, steps: m.steps.map((s) => s.title) })),
      guide: goal.guide,
    };
    expect(goalPlanSchema.safeParse(plan).success).toBe(true);
    const schedule = scheduleGoal({
      startDate: goal.startDate,
      deadline: goal.deadline,
      bufferDays: goal.bufferDays,
      today,
      milestones: goal.milestones.map((m) => ({
        id: String(m.position),
        weight: m.weight,
        plannedDue: m.plannedDue,
        stepsDone: m.steps.filter((s) => s.doneOn).length,
        stepsTotal: m.steps.length,
      })),
    });
    expect(schedule.status).toBe("on_track");
    for (const step of goal.milestones.flatMap((m) => m.steps)) {
      if (step.doneOn) expect(step.doneOn < today).toBe(true);
    }
  });

  it("records money in whole cents, in real categories, with only income going to the goal", () => {
    for (const t of data.transactions) {
      expect(Number.isInteger(t.amountCents) && t.amountCents > 0).toBe(true);
      expect(DEFAULT_CATEGORIES[t.kind].map((c) => c.name)).toContain(t.category);
      if (t.toGoal) expect(t.kind).toBe("income");
      expect(t.occurredOn <= today).toBe(true);
    }
    for (const name of Object.keys(data.budgets)) {
      expect(DEFAULT_CATEGORIES.expense.map((c) => c.name)).toContain(name);
    }
  });

  it("has a note due today and a contact to follow up with, so Today's cards show", () => {
    expect(data.notes.some((n) => n.dueOn === today && !n.doneOn)).toBe(true);
    expect(data.contacts.some((c) => c.followUpOn <= today)).toBe(true);
  });
});
