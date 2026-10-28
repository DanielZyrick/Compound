import { addDays, daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

// The goal scheduling engine: pure functions, no database or AI, so the plan
// is predictable, instant and fully tested.
//
// The idea: a goal's work is planned to finish by its "work end", which is
// the deadline minus the buffer. Progress is measured in effort (each
// milestone has a weight, split evenly over its steps). From today, at the
// pace the original plan assumed, the remaining work gives a projected finish
// date. If that's after the work end, the plan is using its buffer; if it's
// after the deadline, the goal is at risk. Remaining milestones get adjusted
// dates spread from today at that same pace.

export const DEFAULT_BUFFER_PERCENT = 15;
export const MIN_BUFFER_DAYS = 2;

/** Days of buffer for a goal: a share of its length, at least 2 days, always leaving time to work. */
export function bufferDaysFor(startDate: CalendarDate, deadline: CalendarDate, percent: number): number {
  const totalDays = daysBetween(startDate, deadline) + 1;
  if (percent <= 0 || totalDays < 2) return 0;
  const days = Math.max(MIN_BUFFER_DAYS, Math.round((totalDays * percent) / 100));
  return Math.min(days, totalDays - 2); // keep at least 2 working days
}

/** The last day of planned work: the deadline minus the buffer. */
export function workEndFor(deadline: CalendarDate, bufferDays: number): CalendarDate {
  return addDays(deadline, -bufferDays);
}

/**
 * Original due dates for milestones, spread over [start, workEnd] in
 * proportion to their weights. The last milestone is due on the work end.
 */
export function plannedDueDates(startDate: CalendarDate, workEnd: CalendarDate, weights: number[]): CalendarDate[] {
  const planDays = daysBetween(startDate, workEnd) + 1;
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cumulative = 0;
  return weights.map((w) => {
    cumulative += w;
    const day = Math.max(1, Math.round((cumulative / total) * planDays));
    return addDays(startDate, day - 1);
  });
}

export type GoalStatusLevel = "on_track" | "behind" | "at_risk" | "completed";

export type ScheduleInput = {
  startDate: CalendarDate;
  deadline: CalendarDate;
  bufferDays: number;
  today: CalendarDate;
  milestones: { id: string; weight: number; plannedDue: CalendarDate; stepsDone: number; stepsTotal: number }[];
};

export type MilestoneSchedule = {
  id: string;
  plannedDue: CalendarDate;
  /** Where the milestone is now expected to finish; null once it's done. */
  adjustedDue: CalendarDate | null;
  progress: number; // 0..1
  done: boolean;
};

export type Schedule = {
  status: GoalStatusLevel;
  progress: number; // 0..1, by effort
  workEnd: CalendarDate;
  /** When the remaining work finishes at the planned pace; null when completed. */
  projectedEnd: CalendarDate | null;
  bufferDays: number;
  bufferUsed: number; // days of buffer the projection eats into
  daysLeft: number; // until the deadline, from today (negative when overdue)
  milestones: MilestoneSchedule[];
};

/** Progress, status and adjusted milestone dates for a goal, as of `today`. */
export function scheduleGoal({ startDate, deadline, bufferDays, today, milestones }: ScheduleInput): Schedule {
  const workEnd = workEndFor(deadline, bufferDays);
  const planDays = daysBetween(startDate, workEnd) + 1;

  // A milestone with no steps counts as not started.
  const parts = milestones.map((m) => ({
    ...m,
    progress: m.stepsTotal > 0 ? m.stepsDone / m.stepsTotal : 0,
  }));
  const totalWork = parts.reduce((sum, m) => sum + m.weight, 0);
  const doneWork = parts.reduce((sum, m) => sum + m.weight * m.progress, 0);
  const progress = totalWork > 0 ? doneWork / totalWork : 0;
  const daysLeft = daysBetween(today, deadline);

  if (totalWork > 0 && doneWork >= totalWork) {
    return {
      status: "completed",
      progress: 1,
      workEnd,
      projectedEnd: null,
      bufferDays,
      bufferUsed: 0,
      daysLeft,
      milestones: parts.map((m) => ({ id: m.id, plannedDue: m.plannedDue, adjustedDue: null, progress: 1, done: true })),
    };
  }

  // The pace the original plan assumed, in effort per day.
  const pace = totalWork / planDays;
  // Work can't start before the goal does.
  const from = today < startDate ? startDate : today;
  const daysNeeded = Math.ceil((totalWork - doneWork) / pace - 1e-9);
  const projectedEnd = addDays(from, Math.max(daysNeeded, 1) - 1);

  // Each unfinished milestone ends when the remaining work up to it is done.
  let remainingSoFar = 0;
  const scheduled = parts.map((m): MilestoneSchedule => {
    const done = m.stepsTotal > 0 && m.stepsDone >= m.stepsTotal;
    remainingSoFar += m.weight * (1 - m.progress);
    if (done) return { id: m.id, plannedDue: m.plannedDue, adjustedDue: null, progress: 1, done: true };
    const projected = addDays(from, Math.max(Math.ceil(remainingSoFar / pace - 1e-9), 1) - 1);
    // Ahead of plan: keep the planned date rather than pulling it earlier.
    return {
      id: m.id,
      plannedDue: m.plannedDue,
      adjustedDue: projected > m.plannedDue ? projected : m.plannedDue,
      progress: m.progress,
      done: false,
    };
  });

  const bufferUsed = Math.max(0, Math.min(bufferDays, daysBetween(workEnd, projectedEnd)));
  const status: GoalStatusLevel =
    projectedEnd <= workEnd ? "on_track" : projectedEnd <= deadline ? "behind" : "at_risk";

  return { status, progress, workEnd, projectedEnd, bufferDays, bufferUsed, daysLeft, milestones: scheduled };
}
