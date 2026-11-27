import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, DailyMinutes, MoneyKind, Weekday } from "@/lib/db/types";
import type { GoalPlan } from "@/lib/goals/plan";
import { bufferDaysFor, DEFAULT_BUFFER_PERCENT, plannedDueDates, workEndFor } from "@/lib/goals/schedule";
import { demoLesson } from "@/lib/lessons/demo";
import type { LessonContent } from "@/lib/lessons/schema";
import type { NoteColor } from "@/lib/notes/colors";
import { findReadingPlan } from "@/lib/reading/plans";
import { demoPlan } from "@/lib/tracks/plan";

// The sample account behind "Try the demo": about three weeks of realistic
// activity, every date relative to the visitor's today. Pure (no database),
// so it can be tested; lib/demo/create.ts saves it.

/** How long a demo account lasts before it's deleted. */
export const DEMO_LIFETIME_HOURS = 24;
/** At most this many new demo accounts per hour, across everyone. */
export const DEMO_HOURLY_CAP = 50;

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const peso = (amount: number) => Math.round(amount * 100); // amounts are stored in cents

export type DemoHabit = { name: string; schedule: Weekday[]; checkins: CalendarDate[]; linkedToTrack: boolean };

export type DemoData = ReturnType<typeof demoData>;

export function demoData(today: CalendarDate) {
  const ago = (days: number) => addDays(today, -days);

  // Learning: a 14-day Python track, days 1 to 4 done (one a day), day 5 open today.
  const topic = "Python for automating everyday tasks";
  const plan = demoPlan({ topic, type: "skill", level: "beginner", totalDays: 14 });
  const trackStart = ago(4);
  // Two wrong multiple-choice picks (exercise index, choice index), so
  // "Mistakes to review" has something to show.
  const misses: Record<number, { exercise: number; choice: number }> = {
    2: { exercise: 1, choice: 1 },
    4: { exercise: 0, choice: 3 },
  };
  const skillTrack = {
    title: plan.title,
    topic,
    details: "I want to rename files and clean up spreadsheets at work. I know what variables are already.",
    level: "beginner" as const,
    startDate: trackStart,
    days: plan.days.map((d) => ({
      ...d,
      completedOn: d.day <= 4 ? addDays(trackStart, d.day - 1) : null,
      missed: misses[d.day] ?? null,
      lesson:
        d.day <= 4
          ? (demoLesson({ type: "skill", topic, dayTitle: d.title, daySummary: d.summary }) satisfies LessonContent)
          : null,
    })),
  };
  const lessonDates = skillTrack.days.flatMap((d) => (d.completedOn ? [d.completedOn] : []));

  // Reading: John, day 1 read yesterday with a reflection, day 2 open today.
  const john = findReadingPlan("john-21")!;
  const readingTrack = {
    planId: john.id,
    title: john.title,
    startDate: ago(1),
    days: john.days.map((d) => ({
      day: d.day,
      title: d.passage,
      summary: `Read ${d.passage}, then write a short reflection.`,
      completedOn: d.day === 1 ? ago(1) : null,
    })),
    reflection: {
      day: 1,
      text: "\"In the beginning was the Word.\" I want my days to start with what matters most, not with my phone.",
    },
  };

  const habits: DemoHabit[] = [
    {
      // Mon, Wed and Fri for three weeks, with one missed day two weeks ago.
      name: "Go to the gym",
      schedule: [1, 3, 5],
      checkins: datesBack(today, 21).filter((d, i, all) => {
        if (![1, 3, 5].includes(weekdayOf(d))) return false;
        const gymDays = all.filter((x) => [1, 3, 5].includes(weekdayOf(x)));
        return gymDays.indexOf(d) !== 2; // the third gym day was skipped
      }),
      linkedToTrack: false,
    },
    {
      // Every day: a current streak of 8, a miss before it, and a patchy start.
      name: "Read 10 pages",
      schedule: EVERY_DAY,
      checkins: datesBack(today, 20).filter((d) => ![ago(9), ago(13), ago(17)].includes(d)),
      linkedToTrack: false,
    },
    {
      name: `Learn: ${skillTrack.title}`.slice(0, 60),
      schedule: EVERY_DAY,
      checkins: lessonDates,
      linkedToTrack: true,
    },
  ];

  // Goal: started two weeks ago, 60 days long, first milestone done, second under way.
  const goalStart = ago(14);
  const deadline = addDays(goalStart, 59);
  const bufferDays = bufferDaysFor(goalStart, deadline, DEFAULT_BUFFER_PERCENT);
  const goalPlan = portfolioPlan();
  const dues = plannedDueDates(goalStart, workEndFor(deadline, bufferDays), goalPlan.milestones.map((m) => m.weight));
  const doneOn: (CalendarDate | null)[][] = [
    [ago(13), ago(10), ago(7)],
    [ago(4), ago(1), null, null],
    [null, null, null],
  ];
  const goal = {
    title: "Launch my portfolio website",
    why: "So I can apply for developer jobs with real projects to show.",
    details: "Built with Next.js: three case studies, a contact form and my own domain.",
    startDate: goalStart,
    deadline,
    bufferDays,
    targetCents: peso(30_000),
    guide: goalPlan.guide,
    milestones: goalPlan.milestones.map((m, i) => ({
      position: i + 1,
      title: m.title,
      description: m.description,
      weight: m.weight,
      plannedDue: dues[i],
      steps: m.steps.map((title, j) => ({ position: j + 1, title, doneOn: doneOn[i]?.[j] ?? null })),
    })),
  };

  // Money: budgets on three categories and about five weeks of entries.
  const budgets: Record<string, number> = { Food: peso(8_000), Transport: peso(2_500), Fun: peso(2_000) };
  const entry = (kind: MoneyKind, category: string, amount: number, note: string | null, daysAgo: number, toGoal = false) => ({
    kind,
    category,
    amountCents: peso(amount),
    note,
    occurredOn: ago(daysAgo),
    toGoal,
  });
  const transactions = [
    entry("income", "Salary", 25_000, "Monthly pay", 3),
    entry("income", "Salary", 25_000, "Monthly pay", 33),
    entry("income", "Side job", 4_500, "Landing page for a friend's bakery", 12, true),
    entry("income", "Side job", 3_500, "Fixed a WordPress site", 26, true),
    entry("expense", "Food", 180, "Coffee and pandesal", 0),
    entry("expense", "Food", 320, "Lunch with the team", 1),
    entry("expense", "Transport", 120, "Jeepney and MRT", 1),
    entry("expense", "Food", 1_450, "Groceries", 2),
    entry("expense", "Transport", 250, "Grab home", 4),
    entry("expense", "Bills", 2_800, "Internet and phone", 5),
    entry("expense", "Fun", 650, "Movie night", 6),
    entry("expense", "Food", 260, "Dinner", 7),
    entry("expense", "Transport", 90, null, 8),
    entry("expense", "Education", 499, "Python course", 9),
    entry("expense", "Health", 1_500, "Gym membership", 10),
    entry("expense", "Food", 1_320, "Groceries", 11),
    entry("expense", "Shopping", 1_800, "Running shoes", 14),
    entry("expense", "Transport", 300, null, 15),
    entry("expense", "Food", 540, "Family lunch", 16),
    entry("expense", "Fun", 1_200, "Concert ticket", 20),
    entry("expense", "Giving", 500, "Church offering", 21),
    entry("expense", "Food", 1_280, "Groceries", 23),
    entry("expense", "Bills", 2_800, "Internet and phone", 35),
  ];

  const notes: {
    title: string;
    body: string | null;
    pinned: boolean;
    color: NoteColor;
    dueOn: CalendarDate | null;
    doneOn: CalendarDate | null;
  }[] = [
    {
      title: "Portfolio ideas",
      body: "Write the Compound case study first. Add a short video of the app.",
      pinned: true,
      color: "yellow",
      dueOn: null,
      doneOn: null,
    },
    { title: "Renew gym membership", body: null, pinned: false, color: "orange", dueOn: today, doneOn: null },
    { title: "Call Mom on Sunday", body: null, pinned: false, color: "blue", dueOn: addDays(today, 3), doneOn: null },
    { title: "Fix the contact form bug", body: "Emails weren't sending on mobile.", pinned: false, color: "green", dueOn: null, doneOn: ago(1) },
  ];

  const contacts = [
    {
      name: "Ana Reyes",
      company: "Brightlane Studio",
      role: "Senior frontend developer",
      whereMet: "A web developers' meetup in Manila",
      email: "ana@example.com",
      notes: "Offered to review my portfolio once it's live.",
      followUpOn: ago(1), // due: shows on Today
      linkedToGoal: true,
      touchpoints: [{ happenedOn: ago(20), note: "Coffee chat after the meetup" }],
    },
    {
      name: "Marco Santos",
      company: "Lumen Labs",
      role: "Engineering manager",
      whereMet: "LinkedIn",
      email: null,
      notes: "Hiring junior developers next quarter.",
      followUpOn: addDays(today, 10),
      linkedToGoal: false,
      touchpoints: [{ happenedOn: ago(6), note: "Sent my resume" }],
    },
  ];

  return {
    user: { name: "Alex" },
    focus: { goal: "career" as const, description: "Land my first full-time developer job this year." },
    profile: {
      role: "Junior web developer",
      improve: "Writing cleaner code and automating boring work",
      skills: "HTML, CSS, JavaScript, a little React",
      interests: "Productivity, design, basketball",
      dailyMinutes: 20 as DailyMinutes,
    },
    habits,
    skillTrack,
    readingTrack,
    goal,
    budgets,
    transactions,
    notes,
    contacts,
  };
}

/** The last `count` days before today, oldest first. */
function datesBack(today: CalendarDate, count: number): CalendarDate[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count));
}

/** A goal plan written for the demo's portfolio goal (passes goalPlanSchema). */
function portfolioPlan(): GoalPlan {
  return {
    milestones: [
      {
        title: "Plan the site",
        description: "You know which projects to show, what each page says, and how it will look.",
        weight: 1,
        steps: ["Pick three projects for case studies", "Sketch the home and project pages", "Buy the domain"],
      },
      {
        title: "Build the first version",
        description: "Every page works with real content, even if it isn't polished yet.",
        weight: 3,
        steps: [
          "Set up Next.js and deploy an empty site",
          "Write the first case study",
          "Build the contact form",
          "Write the other two case studies",
        ],
      },
      {
        title: "Polish and launch",
        description: "The site is fast, checked on a phone, and shared with people who can help.",
        weight: 1,
        steps: ["Ask two developers for feedback", "Fix what they found", "Share it on LinkedIn"],
      },
    ],
    guide: {
      approach:
        "This is an example guide in a demo account. Ship a rough version early, then improve it with feedback, rather than polishing one page for weeks.",
      firstSteps: [
        "Write the first case study's outline in 20 minutes",
        "Deploy the empty site so every change goes live",
        "Message one developer friend to review it next week",
      ],
      pitfalls: [
        { pitfall: "Redesigning instead of finishing", avoid: "Freeze the design until all three case studies are written." },
        { pitfall: "Showing too many small projects", avoid: "Three strong case studies beat ten links." },
      ],
      stayOnTrack: "Tick off one step a day and check the goal's status every Sunday.",
    },
  };
}
