import { describe, expect, it } from "vitest";
import { buildExport, exportFileName } from "./export";
import type { ExportRows } from "./queries";

const at = new Date("2026-11-20T10:00:00Z");

/** One of everything, linked by ids the way the database links them. */
function rows(): ExportRows {
  return {
    user: {
      email: "dan@example.com",
      name: "Dan",
      timezone: "Asia/Manila",
      currency: "PHP",
      created_at: at,
      onboarded_at: at,
    },
    focusAreas: [{ goal: "career", custom_label: null, description: "Ship side projects", created_at: at }],
    profile: {
      role: "Developer",
      improve: "Testing",
      skills: null,
      interests: null,
      daily_minutes: 20,
      updated_at: at,
    },
    habits: [{ id: "h1", name: "Go to the gym", schedule: [1, 3, 5], created_at: at, archived_at: null }],
    checkins: [
      { habit_id: "h1", date: "2026-11-16" },
      { habit_id: "h1", date: "2026-11-18" },
    ],
    tracks: [
      {
        id: "t1",
        title: "Python basics",
        topic: "Python",
        details: "For automating spreadsheets",
        type: "skill",
        level: "beginner",
        reading_plan: null,
        total_days: 14,
        start_date: "2026-11-15",
        status: "active",
        created_at: at,
      },
    ],
    trackDays: [
      { id: "d1", track_id: "t1", day_number: 1, title: "Variables", summary: "Names for values", completed_at: at },
      { id: "d2", track_id: "t1", day_number: 2, title: "Lists", summary: "Many values", completed_at: null },
    ],
    lessons: [{ id: "l1", track_day_id: "d1", content: { title: "Variables" }, created_at: at }],
    attempts: [
      {
        lesson_id: "l1",
        exercise_index: 0,
        answer: "x = 1",
        is_correct: true,
        feedback: "Right.",
        better_version: null,
        created_at: at,
      },
    ],
    practice: [
      {
        lesson_id: "l1",
        exercise_index: 0,
        content: { type: "multiple_choice", question: "What is `x`?" },
        answer: "1",
        is_correct: true,
        feedback: "Right.",
        better_version: null,
        answered_at: at,
        created_at: at,
      },
    ],
    reflections: [{ track_day_id: "d1", text: "Easier than I thought", created_at: at, updated_at: at }],
    principles: [{ date: "2026-11-20", content: { title: "Start small" }, reflection: null }],
    goals: [
      {
        id: "g1",
        title: "Launch my portfolio",
        why: "Get a job",
        details: null,
        start_date: "2026-11-01",
        deadline: "2027-01-31",
        buffer_days: 9,
        status: "active",
        target_cents: 3_000_000,
        guide: null,
        created_at: at,
        completed_at: null,
      },
    ],
    milestones: [
      {
        id: "m1",
        goal_id: "g1",
        position: 1,
        title: "Design",
        description: null,
        weight: 2,
        planned_due: "2026-11-30",
      },
    ],
    steps: [{ milestone_id: "m1", position: 1, title: "Pick colours", done_on: "2026-11-05" }],
    categories: [
      { id: "c1", kind: "expense", name: "Food", monthly_budget_cents: 800_000, archived_at: null },
      { id: "c2", kind: "income", name: "Side job", monthly_budget_cents: null, archived_at: null },
    ],
    transactions: [
      {
        kind: "expense",
        amount_cents: 12_550,
        category_id: "c1",
        note: "Lunch",
        occurred_on: "2026-11-19",
        goal_id: null,
        created_at: at,
      },
      {
        kind: "income",
        amount_cents: 450_000,
        category_id: "c2",
        note: null,
        occurred_on: "2026-11-18",
        goal_id: "g1",
        created_at: at,
      },
    ],
    notes: [
      {
        title: "Call the bank",
        body: null,
        pinned: true,
        color: "yellow",
        done_at: null,
        due_on: "2026-11-21",
        created_at: at,
        updated_at: at,
      },
    ],
    contacts: [
      {
        id: "k1",
        name: "Ana Reyes",
        company: "Acme",
        role: null,
        where_met: "DevCon",
        email: null,
        phone: null,
        linkedin: null,
        notes: null,
        follow_up_on: "2026-11-25",
        goal_id: "g1",
        created_at: at,
      },
    ],
    touchpoints: [{ contact_id: "k1", happened_on: "2026-11-10", note: "Coffee chat" }],
    calendar: { google_email: "dan@gmail.com", connected_at: at },
    aiCalls: [
      {
        day: "2026-11-20",
        purpose: "lesson",
        model: "model-fast",
        ok: true,
        input_tokens: 100,
        output_tokens: 200,
        created_at: at,
      },
    ],
  } as ExportRows;
}

describe("buildExport", () => {
  const data = buildExport(rows(), at);

  it("puts rows under their parents", () => {
    expect(data.habits[0]).toMatchObject({
      name: "Go to the gym",
      days: ["Monday", "Wednesday", "Friday"],
      checkins: ["2026-11-16", "2026-11-18"],
    });
    const [day1, day2] = data.tracks[0].days;
    expect(day1).toMatchObject({
      day: 1,
      lesson: { title: "Variables" },
      answers: [{ exercise: 1, answer: "x = 1", isCorrect: true }],
      practice: [{ forExercise: 1, exercise: { question: "What is `x`?" }, answer: "1", isCorrect: true }],
      reflection: "Easier than I thought",
    });
    expect(day2).toMatchObject({ day: 2, lesson: null, answers: [], practice: [], reflection: null });
    expect(data.goals[0].milestones[0].steps).toEqual([{ title: "Pick colours", doneOn: "2026-11-05" }]);
    expect(data.contacts[0].touchpoints).toEqual([{ date: "2026-11-10", note: "Coffee chat" }]);
  });

  it("writes money as an amount next to the exact cents, with names instead of ids", () => {
    expect(data.money.transactions).toEqual([
      expect.objectContaining({ amount: "125.50", cents: 12_550, category: "Food", towardGoal: null }),
      expect.objectContaining({ amount: "4500.00", cents: 450_000, category: "Side job", towardGoal: "Launch my portfolio" }),
    ]);
    expect(data.money.categories[0].monthlyBudget).toEqual({ amount: "8000.00", cents: 800_000 });
    expect(data.goals[0].savingsTarget).toEqual({ amount: "30000.00", cents: 3_000_000 });
    expect(data.contacts[0].goal).toBe("Launch my portfolio");
  });

  it("leaves out internal ids and never includes a token", () => {
    const json = JSON.stringify(data);
    for (const id of ["h1", "t1", "d1", "l1", "g1", "m1", "c1", "k1"]) expect(json).not.toContain(`"${id}"`);
    expect(json).not.toMatch(/refresh_?token|access_?token/i);
    expect(data.googleCalendar).toEqual({ connectedAs: "dan@gmail.com", connectedAt: at });
  });

  it("handles a brand-new account with nothing saved", () => {
    const empty = {
      ...rows(),
      focusAreas: [],
      profile: null,
      habits: [],
      checkins: [],
      tracks: [],
      trackDays: [],
      lessons: [],
      attempts: [],
      practice: [],
      reflections: [],
      principles: [],
      goals: [],
      milestones: [],
      steps: [],
      categories: [],
      transactions: [],
      notes: [],
      contacts: [],
      touchpoints: [],
      calendar: null,
      aiCalls: [],
    };
    const result = buildExport(empty, at);
    expect(result.account.email).toBe("dan@example.com");
    expect(result.aboutYou).toBeNull();
    expect(result.googleCalendar).toBeNull();
    expect(result.habits).toEqual([]);
    expect(result.exportedAt).toBe("2026-11-20T10:00:00.000Z");
  });
});

describe("exportFileName", () => {
  it("is dated with the given day", () => {
    expect(exportFileName("2026-11-21")).toBe("compound-export-2026-11-21.json");
  });
});
