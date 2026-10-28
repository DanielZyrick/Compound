import { describe, expect, it } from "vitest";
import { bufferDaysFor, plannedDueDates, scheduleGoal, workEndFor, type ScheduleInput } from "./schedule";

// A 20-day goal: Nov 1 → Nov 20, with 3 days of buffer, so planned work ends Nov 17.
const START = "2026-11-01";
const DEADLINE = "2026-11-20";
const BUFFER = 3;

/** Two equal milestones (Nov 1–8 and Nov 9–17 roughly), 4 steps each. */
function goal(today: string, done: [number, number]): ScheduleInput {
  const [due1, due2] = plannedDueDates(START, workEndFor(DEADLINE, BUFFER), [1, 1]);
  return {
    startDate: START,
    deadline: DEADLINE,
    bufferDays: BUFFER,
    today,
    milestones: [
      { id: "m1", weight: 1, plannedDue: due1, stepsDone: done[0], stepsTotal: 4 },
      { id: "m2", weight: 1, plannedDue: due2, stepsDone: done[1], stepsTotal: 4 },
    ],
  };
}

describe("bufferDaysFor", () => {
  it("takes the given share of the goal's length", () => {
    expect(bufferDaysFor("2026-11-01", "2026-11-30", 15)).toBe(5); // 30 days × 15% = 4.5 → 5
  });

  it("is at least 2 days, unless the buffer is turned off", () => {
    expect(bufferDaysFor("2026-11-01", "2026-11-07", 15)).toBe(2);
    expect(bufferDaysFor("2026-11-01", "2026-11-30", 0)).toBe(0);
  });

  it("always leaves at least 2 days to work", () => {
    expect(bufferDaysFor("2026-11-01", "2026-11-03", 30)).toBe(1);
    expect(bufferDaysFor("2026-11-01", "2026-11-02", 30)).toBe(0);
  });
});

describe("plannedDueDates", () => {
  it("spreads milestones by weight and ends on the work end", () => {
    // 10 planned days, weights 1:1:2 → days 3 (rounded), 5, 10.
    expect(plannedDueDates("2026-11-01", "2026-11-10", [1, 1, 2])).toEqual(["2026-11-03", "2026-11-05", "2026-11-10"]);
  });

  it("never puts a milestone before the start", () => {
    expect(plannedDueDates("2026-11-01", "2026-11-02", [1, 5, 5])[0]).toBe("2026-11-01");
  });
});

describe("scheduleGoal", () => {
  it("is on track when progress matches the plan", () => {
    // Day 9 of 17 planned days, half the work done.
    const s = scheduleGoal(goal("2026-11-09", [4, 0]));
    expect(s.status).toBe("on_track");
    expect(s.progress).toBe(0.5);
    expect(s.bufferUsed).toBe(0);
    expect(s.workEnd).toBe("2026-11-17");
  });

  it("is on track on day one with nothing done", () => {
    expect(scheduleGoal(goal(START, [0, 0])).status).toBe("on_track");
  });

  it("uses the buffer when a little behind, and moves the dates", () => {
    // Nov 7 with a quarter done: the rest needs 13 more days at the planned
    // pace, finishing Nov 19: past the work end (Nov 17), before the deadline.
    const s = scheduleGoal(goal("2026-11-07", [2, 0]));
    expect(s.status).toBe("behind");
    expect(s.bufferUsed).toBeGreaterThan(0);
    expect(s.bufferUsed).toBeLessThanOrEqual(BUFFER);
    expect(s.projectedEnd! > s.workEnd).toBe(true);
    expect(s.projectedEnd! <= DEADLINE).toBe(true);
    const m2 = s.milestones[1];
    expect(m2.adjustedDue! > m2.plannedDue).toBe(true); // "was … → now …"
  });

  it("is at risk when the remaining work can't fit before the deadline", () => {
    const s = scheduleGoal(goal("2026-11-15", [1, 0]));
    expect(s.status).toBe("at_risk");
    expect(s.projectedEnd! > DEADLINE).toBe(true);
    expect(s.bufferUsed).toBe(BUFFER);
  });

  it("gets out of risk when the deadline is extended (the pace doesn't change)", () => {
    const atRisk = goal("2026-11-15", [1, 0]);
    expect(scheduleGoal(atRisk).status).toBe("at_risk");
    const projected = scheduleGoal(atRisk).projectedEnd!;

    // Same plan (same planned dates), deadline moved three weeks later.
    const extended = scheduleGoal({ ...atRisk, deadline: "2026-12-11" });
    expect(extended.projectedEnd).toBe(projected); // same work, same pace
    expect(extended.status).toBe("on_track");
  });

  it("keeps planned dates when ahead of schedule", () => {
    const s = scheduleGoal(goal("2026-11-02", [4, 2]));
    expect(s.status).toBe("on_track");
    for (const m of s.milestones.filter((m) => !m.done)) expect(m.adjustedDue).toBe(m.plannedDue);
  });

  it("marks finished milestones as done with no adjusted date", () => {
    const s = scheduleGoal(goal("2026-11-09", [4, 1]));
    expect(s.milestones[0]).toMatchObject({ done: true, adjustedDue: null, progress: 1 });
    expect(s.milestones[1]).toMatchObject({ done: false, progress: 0.25 });
  });

  it("is completed when every step is done, whatever the date", () => {
    const s = scheduleGoal(goal("2026-11-25", [4, 4]));
    expect(s).toMatchObject({ status: "completed", progress: 1, projectedEnd: null, bufferUsed: 0 });
    expect(s.daysLeft).toBe(-5);
  });

  it("projects from the start date when today is before it", () => {
    const s = scheduleGoal(goal("2026-10-20", [0, 0]));
    expect(s.status).toBe("on_track");
    expect(s.projectedEnd).toBe("2026-11-17");
  });

  it("weights bigger milestones more", () => {
    const input: ScheduleInput = {
      startDate: START,
      deadline: DEADLINE,
      bufferDays: BUFFER,
      today: "2026-11-05",
      milestones: [
        { id: "small", weight: 1, plannedDue: "2026-11-05", stepsDone: 2, stepsTotal: 2 },
        { id: "big", weight: 3, plannedDue: "2026-11-17", stepsDone: 0, stepsTotal: 6 },
      ],
    };
    expect(scheduleGoal(input).progress).toBe(0.25);
  });

  it("treats a milestone with no steps as not started", () => {
    const input: ScheduleInput = {
      startDate: START,
      deadline: DEADLINE,
      bufferDays: BUFFER,
      today: START,
      milestones: [{ id: "empty", weight: 1, plannedDue: "2026-11-17", stepsDone: 0, stepsTotal: 0 }],
    };
    const s = scheduleGoal(input);
    expect(s.progress).toBe(0);
    expect(s.milestones[0].done).toBe(false);
  });
});
