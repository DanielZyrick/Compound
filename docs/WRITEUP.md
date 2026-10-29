# Compound: small daily steps, compounding growth

**Live:** [compound-nine-chi.vercel.app](https://compound-nine-chi.vercel.app) · **Code:** [github.com/DanielZyrick/Compound](https://github.com/DanielZyrick/Compound)

Compound is a web app for getting 1% better every day. In one place, you check off your habits, follow a short AI-generated learning track, take the next step on your goals, and write down what you spent. I designed, built, tested and deployed it on my own as a portfolio project, in small steps that each shipped to production.

![The Today page](screenshots/today.png)

## The problem

Self-improvement usually lives in four apps: a habit tracker, a course platform, a to-do list for goals, and a budgeting app. Each one shows a slice, so it's hard to see whether the small daily steps are adding up. I wanted a single **Today** page that answers one question: *what are the few things I should do today?* Then a Progress page shows how those days compound.

## What it does

**Learning & Habits.** You create habits with a weekly schedule and check them off on Today. Streaks and a 30-day history show your consistency. You can start a learning track by describing what you want to learn, such as "SQL for data analysis". Claude drafts a 7, 14 or 30-day plan, and each day opens a short lesson with exercises. Multiple-choice answers are graded on the server. Written answers get AI feedback and a better version. Reading tracks, such as a Bible plan, follow a fixed plan, link to a real translation, and keep a reflection journal. A principle of the day adds one idea to think about.

**Goals.** You describe a goal, why it matters and a deadline. The AI drafts milestones and steps, which you can edit before and after saving, plus a short execution guide. Each goal keeps buffer days before its deadline for setbacks. As you tick off steps, the app works out whether you're on track, behind and using buffer, or at risk. If you slip, the remaining dates move to fit. Goals that need attention get a dot in the navigation.

![A goal that's slipping, with its savings and adjusted dates](screenshots/goal.png)

**Money.** You record an expense or income in a few taps: amount, category, done. The form stays open for the next one. A month view shows spent, income and what's left, spending by category, and a list grouped by day. You can manage your own categories. Income can go toward a goal's savings target, so the money module and the goals module tell one story.

![The Money page](screenshots/money.png)

## Key technical decisions

**AI output is untrusted input.** Every Claude call runs on the server only, and the API key never reaches the browser. Each response must be JSON that passes a Zod schema. If it doesn't, the call retries once, then shows a clear error. Generated lessons and principles are cached in Postgres, so they are never paid for twice. Every call is logged, with token counts, and counts toward a daily limit of 20 per user. Model names come from environment variables, so switching models doesn't need a code change. Two rules exist because the content matters: the AI never writes scripture text, and the user's own focus description is only used for examples, so it can't pull a plan off-topic.

**A demo mode that makes the app free to run.** With no API key, or with `AI_DEMO_MODE=1`, the app uses clearly labelled example content instead of calling Claude. Anyone can clone and run the full app without paying, and the end-to-end tests never spend credits or flake on nondeterministic output.

**The goal schedule is pure functions, never stored.** Status, adjusted dates and buffer use are computed from the plan and the steps you've ticked, in [`lib/goals/schedule.ts`](../compound/lib/goals/schedule.ts). Nothing about the schedule is saved, so it can't drift out of sync, and it's easy to unit test. Testing caught a real design flaw. I first derived your pace from the current deadline, so extending a deadline *slowed* the expected pace, and an at-risk goal stayed at risk. The fix was to measure pace against the original plan, so extra time really is extra room. A test now pins that behaviour.

**Money in integer cents.** Amounts are parsed from what you type ("1,250.50") into whole cents and stored as integers, never floats, so totals never pick up rounding errors. Formatting uses `Intl` with the currency you pick in Settings. The database enforces the rest: positive amounts, a valid currency code, and unique category names regardless of capitalisation. Categories are archived instead of deleted, so old transactions keep their history.

**Safety around production data.** Development runs on a separate Neon database branch. The migration runner prints which host it's about to touch. A new migration is applied to production *before* the code that needs it is pushed, so the live site never runs code against a schema it doesn't have yet. The end-to-end tests refuse to run unless the database host matches an allowed dev host.

**Fast pages with Next.js 16.** With Cache Components, each page prerenders a static shell, and anything that reads the session streams in inside `<Suspense>`. Auth is checked in a data access layer that every page and server action calls before touching data, not only in middleware. Server actions validate input with Zod and check ownership in the query itself.

## Testing

- **191 unit tests** (Vitest) cover the logic that's easy to get subtly wrong: streaks, timezone-aware dates, the goal schedule, parsing and formatting money, and validating AI output.
- **16 end-to-end flows** (Playwright) run on both a desktop browser and a phone viewport. They cover onboarding, habits, a lesson, a reading, creating and editing goals, falling behind and catching up, recording money, managing categories, and saving toward a goal. They sign in as a dedicated test user, run in demo mode, and clean up afterwards.

## What I learned

- **Write the test the way a person uses the app.** Several "bugs" turned out to be test problems: clicking a button before React had hydrated it, or a check finding the previous page still hidden in the DOM after navigation. Waiting for the page to be interactive, and asserting what's *visible*, made the suite reliable.
- **Round trips add up.** Creating a goal first did one insert per milestone and per step, about ten trips to the database, and it was slow enough to time out tests. Batching the inserts fixed it.
- **Guardrails are cheaper than accidents.** Early on, a misconfigured environment variable pointed a migration at production. Nothing was lost, but it led directly to printing the host before every migration and to the e2e guard.
- **AI features are mostly not about the prompt.** Schemas, retries, caching, limits, logging and a demo mode took more work than the prompts, and they're what make the AI parts dependable.

## What's next

Monthly budgets per category, email reminders, an Explore page that recommends tracks based on your goals, and evals to measure the quality of AI feedback.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · PostgreSQL on Neon · Kysely · Auth.js (GitHub) · Zod · Tailwind CSS 4 · shadcn/ui · Claude API · Vitest · Playwright · Vercel
