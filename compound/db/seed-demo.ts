// Fills a dev account with lived-in demo data for recording the demo video:
// habits with streaks, two goals (one slipping), About you, contacts with a
// follow-up due today, notes, and a month of money with budgets.
//
//   npm run demo:seed -- you@example.com           adds the demo data
//   npm run demo:seed -- you@example.com --reset   clears that account's data first
//
// Sign in and finish onboarding first. Runs only against the dev database
// (DATABASE_URL must point at E2E_DB_HOST), never production. Leaves Google
// Calendar alone; start the dev server with CALENDAR_DEMO_MODE=1 for demo events.
import { sql } from "kysely";
import { addDays, todayIn } from "../lib/dates/calendar";
import { createDb } from "../lib/db/create-db";
import { plannedDueDates } from "../lib/goals/schedule";
import { DEFAULT_CATEGORIES } from "../lib/money/categories";

try {
  process.loadEnvFile(".env.local");
} catch {
  // The environment is provided directly.
}

const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const reset = process.argv.includes("--reset");
if (!email) throw new Error("Usage: npm run demo:seed -- you@example.com [--reset]");

const url = process.env.DATABASE_URL;
const allowed = process.env.E2E_DB_HOST;
if (!url || !allowed) throw new Error("Set DATABASE_URL and E2E_DB_HOST (the dev branch host) in .env.local.");
const host = new URL(url).hostname;
if (host !== allowed) throw new Error(`Refusing to seed ${host}: it isn't E2E_DB_HOST (${allowed}).`);

const db = createDb(url);

async function main() {
  const user = await db
    .selectFrom("users")
    .select(["id", "timezone", "onboarded_at"])
    .where(sql<string>`lower(email)`, "=", email!.toLowerCase())
    .executeTakeFirst();
  if (!user?.onboarded_at) throw new Error(`No onboarded account for ${email} on ${host}. Sign in and finish onboarding first.`);
  const today = todayIn(user.timezone);
  console.log(`Seeding ${email} on ${host} (today is ${today} in ${user.timezone})`);

  if (reset) {
    // Everything the demo touches. Tracks, lessons and the calendar connection stay.
    for (const table of ["habits", "goals", "contacts", "notes", "transactions", "profiles"] as const) {
      await db.deleteFrom(table).where("user_id", "=", user.id).execute();
    }
    await db.updateTable("money_categories").set({ monthly_budget_cents: null }).where("user_id", "=", user.id).execute();
    console.log("Cleared habits, goals, contacts, notes, transactions, profile and budgets.");
  }

  // Habits: three weeks of check-ins with a miss most weeks. Read is done today;
  // Walk is left for you to tick on camera; Write misses yesterday, to fill in.
  const habits = await db
    .insertInto("habits")
    .values(["Read 20 pages", "Walk 30 minutes", "Write for 15 minutes"].map((name) => ({ user_id: user.id, name, schedule: [0, 1, 2, 3, 4, 5, 6] })))
    .returning(["id", "name"])
    .execute();
  // Created weeks ago, so the past check-ins count (created_at can't be set through the typed API).
  await sql`update habits set created_at = now() - interval '40 days' where id in (${sql.join(habits.map((h) => h.id))})`.execute(db);
  const checkins = habits.flatMap((h, hi) =>
    Array.from({ length: 21 }, (_, i) => i)
      .filter((i) => (i + hi * 3) % 7 !== 5 || i < 4)
      .filter((i) => !(i === 0 && h.name !== "Read 20 pages")) // only Read is done today
      .filter((i) => !(i === 1 && h.name === "Write for 15 minutes")) // yesterday missed
      .map((i) => ({ habit_id: h.id, date: addDays(today, -i) })),
  );
  await db.insertInto("habit_checkins").values(checkins).onConflict((oc) => oc.doNothing()).execute();

  // Goals: a job search that's a little behind, and a savings goal.
  async function goal(title: string, why: string, startOffset: number, deadlineOffset: number, bufferDays: number, milestones: { title: string; steps: string[] }[]) {
    const start = addDays(today, startOffset);
    const deadline = addDays(today, deadlineOffset);
    const dues = plannedDueDates(start, addDays(deadline, -bufferDays), milestones.map(() => 1));
    const row = await db
      .insertInto("goals")
      .values({ user_id: user!.id, title, why, start_date: start, deadline, buffer_days: bufferDays, plan_source: "demo", guide: null })
      .returning("id")
      .executeTakeFirstOrThrow();
    const stepIds: string[][] = [];
    for (const [i, m] of milestones.entries()) {
      const ms = await db
        .insertInto("goal_milestones")
        .values({ goal_id: row.id, position: i + 1, title: m.title, weight: 1, planned_due: dues[i] })
        .returning("id")
        .executeTakeFirstOrThrow();
      const steps = await db
        .insertInto("goal_steps")
        .values(m.steps.map((s, j) => ({ milestone_id: ms.id, position: j + 1, title: s })))
        .returning("id")
        .execute();
      stepIds.push(steps.map((s) => s.id));
    }
    return { id: row.id, stepIds };
  }
  async function done(stepId: string, daysAgo: number) {
    await db.updateTable("goal_steps").set({ done_on: addDays(today, -daysAgo) }).where("id", "=", stepId).execute();
  }

  const job = await goal(
    "Get a backend developer job",
    "I want to build the systems behind the apps, not just the screens.",
    -28,
    62,
    9,
    [
      { title: "Sharpen the basics", steps: ["Finish a SQL course", "Build a small REST API", "Write tests for the API"] },
      { title: "Show the work", steps: ["Polish my portfolio", "Write a project case study", "Update my resume"] },
      { title: "Apply and interview", steps: ["Send 10 tailored applications", "Practise system design", "Do two mock interviews"] },
      { title: "Land the offer", steps: ["Negotiate the offer", "Accept and plan the first month"] },
    ],
  );
  await done(job.stepIds[0][0], 22);
  await done(job.stepIds[0][1], 15);
  await done(job.stepIds[0][2], 9);
  await done(job.stepIds[1][0], 3);

  const fund = await goal(
    "Build a ₱50,000 emergency fund",
    "Three months of costs set aside, so a surprise bill is never a crisis.",
    -30,
    60,
    10,
    [
      { title: "Set up the basics", steps: ["Open a separate savings account", "List fixed monthly costs", "Set up an automatic transfer"] },
      { title: "Cut the small leaks", steps: ["Review last month's spending", "Cancel two unused subscriptions"] },
      { title: "Reach ₱25,000", steps: ["Save the first ₱10,000", "Save the next ₱15,000"] },
      { title: "Finish the fund", steps: ["Save the final ₱25,000", "Move it to a high-interest account"] },
    ],
  );
  await db.updateTable("goals").set({ target_cents: 5_000_000 }).where("id", "=", fund.id).execute();
  await done(fund.stepIds[0][0], 26);
  await done(fund.stepIds[0][1], 24);
  await done(fund.stepIds[0][2], 20);
  await done(fund.stepIds[1][0], 12);

  // About you, so Learn shows real suggestions.
  await db
    .insertInto("profiles")
    .values({
      user_id: user.id,
      role: "Web developer, mostly frontend",
      improve: "Backend development, system design, public speaking",
      skills: "HTML, CSS, JavaScript, TypeScript, React, Next.js",
      interests: "Running, personal finance",
      daily_minutes: 20,
    })
    .onConflict((oc) => oc.column("user_id").doNothing())
    .execute();

  // Contacts: Ana is due today and can help with the job goal.
  const [ana] = await db
    .insertInto("contacts")
    .values([
      { user_id: user.id, name: "Ana Cruz", company: "Acme Digital", role: "Engineering manager", where_met: "DevCon Manila 2026", follow_up_on: today, goal_id: job.id, email: "ana@example.com", linkedin: "https://www.linkedin.com/in/example", notes: "Hiring backend developers next quarter.\nAsked me to send my portfolio." },
      { user_id: user.id, name: "Ben Reyes", company: "Globe", role: "Technical recruiter", where_met: "LinkedIn", follow_up_on: addDays(today, 5), goal_id: job.id },
      { user_id: user.id, name: "Carla Lim", company: "Freelance", role: "Product designer", where_met: "Referred by Ana" },
      { user_id: user.id, name: "Dan Santos", company: "GCash", role: "Senior backend engineer", where_met: "Manila JS meetup", follow_up_on: addDays(today, 12) },
    ])
    .returning("id")
    .execute();
  await db
    .insertInto("contact_touchpoints")
    .values([
      { contact_id: ana.id, happened_on: addDays(today, -20), note: "Met at DevCon, talked about their backend team" },
      { contact_id: ana.id, happened_on: addDays(today, -9), note: "Coffee chat, sent my portfolio" },
    ])
    .execute();

  // Notes: different colours, one pinned, one done.
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
  await db
    .insertInto("notes")
    .values([
      { user_id: user.id, title: "Send Ana the case study", body: "The Compound write-up, with screenshots.", pinned: true, color: "yellow", updated_at: minutesAgo(5) },
      { user_id: user.id, title: "Book a dentist appointment", color: "pink", updated_at: minutesAgo(30) },
      { user_id: user.id, title: "Ideas for the weekend", body: "Long run on Saturday morning.\nTry the new ramen place.", color: "blue", updated_at: minutesAgo(60) },
      { user_id: user.id, title: "Read: Designing Data-Intensive Applications", body: "Chapter 3 next.", color: "green", updated_at: minutesAgo(90) },
      { user_id: user.id, title: "Renew gym membership", color: "orange", done_at: minutesAgo(10), updated_at: minutesAgo(10) },
    ])
    .execute();

  // Money: the same default categories the app creates on the first visit to Money.
  await db
    .insertInto("money_categories")
    .values(
      (["expense", "income"] as const).flatMap((kind) =>
        DEFAULT_CATEGORIES[kind].map((c, i) => ({ user_id: user.id, kind, name: c.name, icon: c.icon, position: i + 1 })),
      ),
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
  const categories = await db.selectFrom("money_categories").select(["id", "name"]).where("user_id", "=", user.id).execute();
  const cat = (name: string) => categories.find((c) => c.name === name)?.id ?? categories[0].id;
  for (const [name, cents] of [["Food", 800_000], ["Transport", 250_000], ["Fun", 300_000]] as const) {
    await db.updateTable("money_categories").set({ monthly_budget_cents: cents }).where("id", "=", cat(name)).execute();
  }

  // Spending spread over the last five weeks, so this month and last month both look real.
  const spend: [number, string, number, string | null][] = [
    [34, "Bills", 8_500, "Rent share"], [32, "Food", 1_240, "Groceries"], [30, "Transport", 450, null],
    [27, "Fun", 600, "Movie night"], [25, "Food", 1_560, "Groceries"], [22, "Health", 950, "Vitamins"],
    [19, "Food", 1_420, "Groceries"], [17, "Education", 499, "SQL course"], [14, "Transport", 520, null],
    [12, "Food", 1_380, "Groceries"], [10, "Fun", 350, null], [8, "Bills", 1_699, "Internet"],
    [6, "Food", 320, "Lunch"], [5, "Transport", 380, null], [4, "Shopping", 1_850, "Running shoes"],
    [3, "Food", 1_240, "Groceries"], [2, "Fun", 1_200, "Concert tickets"], [1, "Transport", 260, null],
    [0, "Food", 165, "Coffee"],
  ];
  await db
    .insertInto("transactions")
    .values([
      ...spend.map(([daysAgo, c, amount, note]) => ({
        user_id: user.id,
        kind: "expense" as const,
        amount_cents: amount * 100,
        category_id: cat(c),
        note,
        occurred_on: addDays(today, -daysAgo),
      })),
      { user_id: user.id, kind: "income" as const, amount_cents: 3_500_000, category_id: cat("Salary"), note: "Salary", occurred_on: addDays(today, -21) },
      { user_id: user.id, kind: "income" as const, amount_cents: 1_200_000, category_id: cat("Salary"), note: "Savings transfer", occurred_on: addDays(today, -20), goal_id: fund.id },
      { user_id: user.id, kind: "income" as const, amount_cents: 600_000, category_id: cat("Side job"), note: "Website fix", occurred_on: addDays(today, -7) },
    ])
    .execute();

  console.log("Done: 3 habits, 2 goals, About you, 4 contacts, 5 notes, 22 transactions and 3 budgets.");
  console.log("Start the dev server with CALENDAR_DEMO_MODE=1 to show demo calendar events instead of your own.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
