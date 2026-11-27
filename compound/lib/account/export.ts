import type { ExportRows } from "./queries";
import { centsToInput } from "@/lib/money/amount";

// "Download my data": shapes the raw rows into one readable JSON file. Pure,
// so it's tested without a database. Internal ids are only used here to put
// rows under their parent (a check-in under its habit, a step under its
// milestone) and are left out of the file: they mean nothing outside the app.
// Timestamps become ISO strings when the file is written (JSON.stringify).

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** "compound-export-2026-11-21.json", dated with the user's today. */
export function exportFileName(today: string) {
  return `compound-export-${today}.json`;
}

/** Amounts as "1250.50" next to the exact whole cents they're stored in. */
function money(cents: number | null) {
  return cents === null ? null : { amount: centsToInput(cents), cents };
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = groups.get(k);
    if (list) list.push(row);
    else groups.set(k, [row]);
  }
  return (k: string) => groups.get(k) ?? [];
}

export function buildExport(rows: ExportRows, exportedAt: Date) {
  const checkinsOf = groupBy(rows.checkins, (c) => c.habit_id);
  const daysOf = groupBy(rows.trackDays, (d) => d.track_id);
  const lessonOf = groupBy(rows.lessons, (l) => l.track_day_id);
  const attemptsOf = groupBy(rows.attempts, (a) => a.lesson_id);
  const practiceOf = groupBy(rows.practice, (p) => p.lesson_id);
  const reflectionOf = groupBy(rows.reflections, (r) => r.track_day_id);
  const milestonesOf = groupBy(rows.milestones, (m) => m.goal_id);
  const stepsOf = groupBy(rows.steps, (s) => s.milestone_id);
  const touchpointsOf = groupBy(rows.touchpoints, (t) => t.contact_id);
  const categoryName = new Map(rows.categories.map((c) => [c.id, c.name]));
  const goalTitle = new Map(rows.goals.map((g) => [g.id, g.title]));
  const { user } = rows;

  return {
    about: "Your data from Compound. Dates are in your timezone; times are UTC.",
    exportedAt: exportedAt.toISOString(),
    account: {
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      currency: user.currency,
      createdAt: user.created_at,
      onboardedAt: user.onboarded_at,
    },
    focusAreas: rows.focusAreas.map((f) => ({
      area: f.goal,
      customLabel: f.custom_label,
      description: f.description,
      createdAt: f.created_at,
    })),
    aboutYou: rows.profile && {
      role: rows.profile.role,
      improve: rows.profile.improve,
      skills: rows.profile.skills,
      interests: rows.profile.interests,
      dailyMinutes: rows.profile.daily_minutes,
      updatedAt: rows.profile.updated_at,
    },
    habits: rows.habits.map((h) => ({
      name: h.name,
      days: h.schedule.map((d) => WEEKDAYS[d]),
      createdAt: h.created_at,
      archivedAt: h.archived_at,
      checkins: checkinsOf(h.id).map((c) => c.date),
    })),
    tracks: rows.tracks.map((t) => ({
      title: t.title,
      topic: t.topic,
      details: t.details,
      type: t.type,
      level: t.level,
      readingPlan: t.reading_plan,
      totalDays: t.total_days,
      startDate: t.start_date,
      status: t.status,
      createdAt: t.created_at,
      days: daysOf(t.id).map((d) => {
        const lesson = lessonOf(d.id)[0];
        return {
          day: d.day_number,
          title: d.title,
          summary: d.summary,
          completedAt: d.completed_at,
          lesson: lesson?.content ?? null,
          answers: (lesson ? attemptsOf(lesson.id) : []).map((a) => ({
            exercise: a.exercise_index + 1,
            answer: a.answer,
            isCorrect: a.is_correct,
            feedback: a.feedback,
            betterVersion: a.better_version,
            createdAt: a.created_at,
          })),
          // Fresh exercises the AI wrote for mistakes in this lesson.
          practice: (lesson ? practiceOf(lesson.id) : []).map((p) => ({
            forExercise: p.exercise_index + 1,
            exercise: p.content,
            answer: p.answer,
            isCorrect: p.is_correct,
            feedback: p.feedback,
            betterVersion: p.better_version,
            answeredAt: p.answered_at,
            createdAt: p.created_at,
          })),
          reflection: reflectionOf(d.id)[0]?.text ?? null,
        };
      }),
    })),
    principles: rows.principles.map((p) => ({ date: p.date, principle: p.content, reflection: p.reflection })),
    goals: rows.goals.map((g) => ({
      title: g.title,
      why: g.why,
      details: g.details,
      startDate: g.start_date,
      deadline: g.deadline,
      bufferDays: g.buffer_days,
      status: g.status,
      savingsTarget: money(g.target_cents),
      guide: g.guide,
      createdAt: g.created_at,
      completedAt: g.completed_at,
      milestones: milestonesOf(g.id).map((m) => ({
        title: m.title,
        description: m.description,
        weight: m.weight,
        plannedDue: m.planned_due,
        steps: stepsOf(m.id).map((s) => ({ title: s.title, doneOn: s.done_on })),
      })),
    })),
    money: {
      currency: user.currency,
      categories: rows.categories.map((c) => ({
        kind: c.kind,
        name: c.name,
        monthlyBudget: money(c.monthly_budget_cents),
        archivedAt: c.archived_at,
      })),
      transactions: rows.transactions.map((t) => ({
        date: t.occurred_on,
        kind: t.kind,
        ...money(t.amount_cents)!,
        category: categoryName.get(t.category_id) ?? null,
        note: t.note,
        towardGoal: t.goal_id ? (goalTitle.get(t.goal_id) ?? null) : null,
        createdAt: t.created_at,
      })),
    },
    notes: rows.notes.map((n) => ({
      title: n.title,
      body: n.body,
      pinned: n.pinned,
      color: n.color,
      dueOn: n.due_on,
      doneAt: n.done_at,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
    contacts: rows.contacts.map((c) => ({
      name: c.name,
      company: c.company,
      role: c.role,
      whereMet: c.where_met,
      email: c.email,
      phone: c.phone,
      linkedin: c.linkedin,
      notes: c.notes,
      followUpOn: c.follow_up_on,
      goal: c.goal_id ? (goalTitle.get(c.goal_id) ?? null) : null,
      createdAt: c.created_at,
      touchpoints: touchpointsOf(c.id).map((t) => ({ date: t.happened_on, note: t.note })),
    })),
    googleCalendar: rows.calendar && {
      connectedAs: rows.calendar.google_email,
      connectedAt: rows.calendar.connected_at,
    },
    aiUsage: rows.aiCalls.map((a) => ({
      day: a.day,
      purpose: a.purpose,
      model: a.model,
      ok: a.ok,
      inputTokens: a.input_tokens,
      outputTokens: a.output_tokens,
      at: a.created_at,
    })),
  };
}
