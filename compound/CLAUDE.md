@AGENTS.md

# Project: Compound

Tagline: Small daily steps, compounding growth.

Compound is a web app where users track daily habits and follow AI-generated learning tracks
(e.g., English, Python, Bible reading, business, thinking skills) with daily lessons,
typed exercises, and AI feedback. It also shows a daily thinking or business principle
and recommends new tracks based on the user's goals.

This is my portfolio project. I am the developer; you are my pair programmer.

## Tech stack
- Next.js (App Router), TypeScript (strict), Tailwind CSS
- PostgreSQL with Kysely (typed queries, migrations with Kysely's migrator)
- Auth.js (NextAuth) for authentication
- Claude API via @anthropic-ai/sdk, called ONLY from server code (route handlers / server actions)
- Zod for validating all AI JSON output and form input
- Deployed on Vercel

## Database tables
- users (id, email, name, timezone, created_at)
- focus_areas (id, user_id, goal, custom_label, created_at) — chosen during onboarding:
  career, business, faith, health, or custom (was user_goals; renamed in migration 003)
- habits (id, user_id, name, schedule, created_at, archived_at)
- habit_checkins (id, habit_id, date, created_at) — unique (habit_id, date)
- tracks (id, user_id, title, goal, type: skill | reading | thinking, total_days,
  start_date, habit_id nullable, status)
- track_days (id, track_id, day_number, title, summary)
- lessons (id, track_day_id, content_json, created_at)
- attempts (id, lesson_id, user_id, exercise_index, answer, feedback_json,
  is_correct, created_at)
- reflections (id, user_id, track_day_id, text, created_at)
- daily_principles (id, user_id, date, content_json, reflection, created_at)
  — one principle per user per day, generated once and cached

Rules:
- Streaks are calculated from habit_checkins, never stored.
- Completing a lesson in a track with a habit_id auto-checks that habit for the day.
- All dates use the user's timezone.

## Pages
- /onboarding — choose goals and create first habits
- /today — today's habits, lessons, and principle of the day
- /habits — manage habits and see streaks
- /tracks — list of learning tracks
- /tracks/new — create a track from a goal
- /tracks/[id] — the track's plan and progress
- /tracks/[id]/day/[n] — the daily lesson, exercises, and feedback
- /explore — AI-recommended tracks (version 2)
- /progress — overall stats and history
- /settings — timezone and account

## Track types
- skill — lessons with exercises that have right or better answers
  (e.g., English, Python). AI feedback checks correctness and explains mistakes.
- reading — a fixed reading plan with a reflection journal (e.g., Bible).
  No AI-generated reading content.
- thinking — lessons built on real-life scenarios (e.g., business, decision-making,
  mental models). The user types their reasoning; AI feedback evaluates the
  reasoning, not just correctness.

## AI features
1. Plan generation: from a goal, duration, and level, return JSON
   { title, days: [{ day, title, summary }] }. Validate and save to track_days.
2. Lesson generation: the first time a day is opened, generate the lesson and
   exercises as JSON and save to lessons. Load from the database after that.
3. Feedback: from the exercise and the user's answer, return JSON
   { isCorrect, feedback, betterVersion }. Save to attempts.
4. Principle of the day: one short thinking or business principle with an example
   and one reflection question, based on the user's goals. Cached per user per day.
5. Recommendations (version 2): suggest 3 tracks based on user_goals, active tracks,
   and completed tracks. One click creates the track.

## AI rules
- Never expose the API key to the browser. Read it from env (ANTHROPIC_API_KEY).
- Model names come from env vars (e.g., MODEL_FAST, MODEL_SMART), never hardcoded.
  Use the fast model for feedback and the smart model for plan generation.
- Every AI response must be JSON, validated with a Zod schema. On invalid output,
  retry once, then show a clear error.
- Never regenerate content that is already cached (lessons, daily principles).
- Add a simple per-user daily limit on AI calls.
- For Bible reading, never let the AI generate scripture text. Use a fixed reading
  plan and link to or fetch a real translation.

## How to work with me
- Work in small steps. Before writing code for a new feature, briefly explain your
  plan and wait for my OK.
- After each step, explain what you changed and why in simple English, so I fully
  understand my own codebase.
- Keep components small and readable. Prefer clear code over clever code.
- Write tests for important logic (streak calculation, AI output validation, dates
  and timezones).
- Never commit secrets. Keep .env.local out of git and maintain an .env.example.
- Suggest a git commit message after each completed step.
- If something is unclear, ask me instead of guessing.

## Milestones
1. Setup, auth, database, onboarding (goals), habits, check-ins, Today page
   (no AI yet). Deploy to Vercel.
2. Learning tracks with AI plan generation.
3. Daily lessons, exercises, and AI feedback (skill and thinking track types).
4. Bible reading track, reflections, principle of the day, progress page.
5. Polish: mobile layout, loading and error states, tests.
6. README, demo video, portfolio write-up.

## Version 2 (after milestone 6)
- /explore page with AI-recommended tracks
- Run Python code in the browser for Python exercises
- Mistake tracking and personalized review exercises
- Calendar heatmap for habits
- Reminders
- Evals for AI feedback quality
