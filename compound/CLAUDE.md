@AGENTS.md

# Project: Compound

Tagline: Small daily steps, compounding growth.

Compound is a web app for getting 1% better every day. It has three modules:
1. **Learning & Habits** — daily habits with streaks, AI-generated learning tracks
   (e.g., English, Python, Bible reading, business, thinking skills) with daily lessons,
   typed exercises and AI feedback, and a daily thinking or business principle.
2. **Goals** — the AI drafts a plan (milestones and steps) the user can edit. Each goal
   has a deadline with buffer days, and a schedule that adjusts itself when the user
   falls behind. In-app reminders only.
3. **Money** — record every expense and income. Monthly view, user-managed categories,
   and income that can go toward a goal's savings target.

This is my portfolio project. I am the developer; you are my pair programmer.

## Tech stack
- Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript (strict), Tailwind CSS 4,
  shadcn/ui on Base UI
- PostgreSQL on Neon with Kysely (typed queries, migrations with Kysely's migrator)
- Auth.js (NextAuth) with Google and GitHub sign-in. Users are matched by email, so only
  provider-verified emails are accepted (`auth.ts`, `lib/auth/verified-email.ts`).
- Claude API via @anthropic-ai/sdk, called ONLY from server code (route handlers / server actions)
- Zod 4 for validating all AI JSON output and form input
- Vitest for unit tests, Playwright for end-to-end tests
- Deployed on Vercel (root directory `compound`)

## Database tables
Types live in `lib/db/types.ts`; migrations in `db/migrations/` (listed in `index.ts`).
- users (id, email, name, image, timezone, currency, created_at, onboarded_at)
- focus_areas (id, user_id, goal, custom_label, description, created_at) — chosen during
  onboarding: career, business, faith, health, or custom
- habits (id, user_id, name, schedule, created_at, archived_at)
- habit_checkins (id, habit_id, date, created_at) — unique (habit_id, date)
- tracks (id, user_id, title, topic, type: skill | reading | thinking, level, reading_plan,
  total_days, start_date, habit_id nullable, status, plan_source)
- track_days (id, track_id, day_number, title, summary, completed_at)
- lessons (id, track_day_id, content, source, created_at)
- attempts (id, lesson_id, user_id, exercise_index, answer, is_correct, feedback,
  better_version, source, created_at)
- reflections (id, user_id, track_day_id, text, created_at, updated_at)
- daily_principles (id, user_id, date, content, source, reflection, created_at)
  — one principle per user per day, generated once and cached
- ai_calls (id, user_id, day, purpose, model, ok, input_tokens, output_tokens, created_at)
  — for the daily limit and cost tracking
- goals (id, user_id, title, why, start_date, deadline, buffer_days, status, plan_source,
  guide, target_cents, created_at, completed_at)
- goal_milestones (id, goal_id, position, title, description, weight, planned_due)
- goal_steps (id, milestone_id, position, title, done_on, created_at)
- money_categories (id, user_id, kind: expense | income, name, icon, position, archived_at)
  — unique per (user_id, kind, lower(name)); defaults are seeded on first use
- transactions (id, user_id, kind, amount_cents, category_id, note, occurred_on, goal_id)
- notes (id, user_id, title, body, pinned, done_at, created_at, updated_at) — quick notes and
  to-dos; done_at set when ticked off

Rules:
- Streaks are calculated from habit_checkins, never stored.
- Goal schedules (status, adjusted dates, buffer used) are calculated by pure functions in
  `lib/goals/schedule.ts`, never stored. The pace comes from the ORIGINAL plan's last
  planned_due, so extending a deadline really helps.
- A track day opens on its own date OR as soon as the previous day is done (own pace, in
  order; `isDayOpen` in `lib/lessons/rules.ts`). Server actions enforce the same rule.
- Completing a lesson in a track with a habit_id auto-checks that habit for the day.
- All dates use the user's timezone (`lib/dates/calendar.ts`).
- Money is stored in integer cents (`lib/money/amount.ts`), never floats. One currency per
  user, PHP by default.
- Archived categories stay on old transactions but aren't offered for new ones. Only income
  can go toward a goal, and only a goal with a savings target.

## Pages
- /onboarding — step form: focus areas with a description, first habits, timezone
- /today — habits, today's lessons, goal steps due, spent today, principle of the day
- /habits — manage habits and see streaks
- /tracks, /tracks/new, /tracks/[id], /tracks/[id]/day/[n] — learning tracks and lessons
- /goals, /goals/new, /goals/[id] — goals, the AI plan, step editing, savings
- /money — quick add (`?add=expense|income`), month view (`?month=YYYY-MM`)
- /money/categories — add, rename, change icon, archive, restore categories
- /notes — quick notes and to-dos (`?filter=open|done|all`); also a Notes card on Today.
  In the desktop sidebar only; phones reach it from the Today card
- /progress — overall stats and habit history
- /settings — display name, timezone, currency, sign out
- /explore — AI-recommended tracks (version 2)

## Track types
- skill — lessons with exercises that have right or better answers
  (e.g., English, Python). AI feedback checks correctness and explains mistakes.
- reading — a fixed reading plan with a reflection journal (e.g., Bible).
  No AI-generated reading content.
- thinking — lessons built on real-life scenarios (e.g., business, decision-making,
  mental models). The user types their reasoning; AI feedback evaluates the
  reasoning, not just correctness.

## AI features
1. Track plan: from a topic, duration, and level, return JSON
   { title, days: [{ day, title, summary }] }. Validate and save to track_days.
2. Lesson: the first time a day is opened, generate the lesson and exercises as JSON and
   save to lessons. Load from the database after that.
3. Feedback: from the exercise and the user's answer, return JSON
   { isCorrect, feedback, betterVersion }. Save to attempts.
4. Principle of the day: one short principle with an example and one reflection question,
   based on the user's focus areas. Cached per user per day.
5. Goal plan: from a goal, why and deadline, return milestones with weights and steps,
   plus an execution guide. The user can edit it before and after saving.
6. Recommendations (version 2): suggest 3 tracks based on focus areas and tracks.

## AI rules
- Never expose the API key to the browser. Read it from env (ANTHROPIC_API_KEY).
- Model names come from env vars (MODEL_FAST, MODEL_SMART), never hardcoded.
  Use the fast model for feedback and the smart model for plan generation.
- Every AI response must be JSON, validated with a Zod schema. On invalid output,
  retry once, then show a clear error.
- Never regenerate content that is already cached (lessons, daily principles).
- A per-user daily limit on AI calls (`lib/ai/config.ts`), logged in ai_calls.
- Demo mode: with no ANTHROPIC_API_KEY, or AI_DEMO_MODE=1, use labelled example content
  instead of calling Claude. The e2e tests always run in demo mode.
- The user's focus text is context for examples only; it must not pull a plan off-topic.
- For Bible reading, never let the AI generate scripture text. Use a fixed reading
  plan and link to or fetch a real translation.

## Code conventions
- Read the Next.js docs in `node_modules/next/dist/docs/` before using an API (see AGENTS.md).
- Anything that reads the session goes inside `<Suspense>`; pages call
  `requireUser()` / `requireOnboardedUser()` from `lib/auth/dal.ts`, and so does every
  server action before touching data.
- Server actions validate input with Zod, check ownership in the query, then call
  `refresh()`. Call `revalidatePath` before `redirect`.
- Form actions return `{ errors: string[] }` with messages written for the user.
- Batch inserts where possible; avoid one round trip per row.
- Unit tests sit next to the code (`*.test.ts`). E2E tests live in `e2e/`.

## Database and deploy safety
- `.env.local` points BOTH DATABASE_URL and DATABASE_URL_UNPOOLED at the Neon `dev`
  branch. Production is the `main` branch. `db/migrate.ts` prints the host it uses: check it.
- Don't run `vercel env pull` (it overwrites `.env.local`).
- A new migration runs on production BEFORE the code that uses it is pushed, via a
  temporary gitignored `.env.migrate-main` (see README). Delete that file afterwards.
- Never print secret values. When inspecting env files, show variable names and hostnames only.
- E2E tests refuse to run unless DATABASE_URL's host equals E2E_DB_HOST (the dev host).

## How to work with me
- Work in small steps. Before writing code for a new feature, briefly explain your
  plan and wait for my OK.
- After each step, explain what you changed and why in simple English, so I fully
  understand my own codebase.
- Keep components small and readable. Prefer clear code over clever code.
- Ask before adding a new library. Keep the app deployable after every step.
- Write tests for important logic (streaks, goal schedules, money amounts, AI output
  validation, dates and timezones), and an e2e test for each main flow.
- Before suggesting a commit, run typecheck, lint, unit tests and `npm run test:e2e`.
- Never commit secrets. Keep .env.local out of git and maintain an .env.example.
- Suggest a git commit message after each completed step. Commit only when I say
  "commit". I push myself.
- If something is unclear, ask me instead of guessing.

## Milestones
1. ✅ Setup, auth, database, onboarding, habits, check-ins, Today page. Deployed to Vercel.
2. ✅ Learning tracks with AI plan generation.
3. ✅ Daily lessons, exercises, and AI feedback (skill and thinking track types).
4. ✅ Bible reading track, reflections, principle of the day, progress page.
5. ✅ Polish: mobile layout, loading and error states, settings, tests.
6. ✅ Goals module.
7. ✅ Money module.
8. README (✅), demo video, portfolio write-up.

## Version 2
- /explore page with AI-recommended tracks
- Monthly budgets per category
- Email reminders
- Run Python code in the browser for Python exercises
- Mistake tracking and personalized review exercises
- Evals for AI feedback quality
