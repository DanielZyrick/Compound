# Compound: small daily steps, compounding growth

**Live:** [compound-nine-chi.vercel.app](https://compound-nine-chi.vercel.app) (press **Try the demo** for a sample account, no sign-in needed) · **Code:** [github.com/DanielZyrick/Compound](https://github.com/DanielZyrick/Compound)

Compound is a web app for getting 1% better every day. In one place, you check off your habits, follow a short AI-generated learning track picked for you, take the next step on your goals, follow up with the people in your network, see today's calendar, jot down a quick to-do, and write down what you spent. I designed, built, tested and deployed it on my own as a portfolio project, in small steps that each shipped to production.

![The Today page](screenshots/today.png)

## The problem

Self-improvement usually lives in four apps: a habit tracker, a course platform, a to-do list for goals, and a budgeting app. Each one shows a slice, so it's hard to see whether the small daily steps are adding up. I wanted a single **Today** page that answers one question: *what are the few things I should do today?* Then a Progress page shows how those days compound.

## What it does

**Learning & Habits.** You create habits with a weekly schedule and check them off on Today. Streaks and a 30-day history show your consistency. Forgot to tick the gym yesterday? The Habits page lets you fill in any day from the last week when the habit was due, with a nudge to be honest. You can start a learning track by describing what you want to learn, such as "SQL for data analysis". Claude drafts a 7, 14 or 30-day plan, and each day opens a short lesson with exercises. You go at your own pace: a day opens on its date, or as soon as you finish the one before, so a 30-day track can take a week. Multiple-choice answers are graded on the server. Written answers get AI feedback and a better version. In coding tracks, examples are shown the way documentation shows them: coloured code with a copy button and the exact output underneath, and a lesson can add a small diagram (a flow, a comparison or a table) where a picture explains faster than words. Code answers are typed in a code box where Tab indents and Enter keeps the indentation. Reading tracks, such as a Bible plan, follow a fixed plan, link to a real translation, and keep a reflection journal. A principle of the day adds one idea to think about.

![A lesson: a code example with its output, and a diagram comparing map and filter](screenshots/lesson.png)

**Goals.** You describe a goal, why it matters and a deadline. The AI drafts milestones and steps, which you can edit before and after saving, plus a short execution guide. Each goal keeps buffer days before its deadline for setbacks. As you tick off steps, the app works out whether you're on track, behind and using buffer, or at risk. If you slip, the remaining dates move to fit. Goals that need attention get a dot in the navigation.

![A goal that's slipping, with its savings and adjusted dates](screenshots/goal.png)

**Money.** You record an expense or income in a few taps: amount, category, done. The form stays open for the next one. A month view shows spent, income and what's left, spending by category, and a list grouped by day. You can manage your own categories and give any of them a monthly budget, which fills up as you spend. Income can go toward a goal's savings target, so the money module and the goals module tell one story.

![The Money page](screenshots/money.png)

**Notes.** Quick notes and to-dos live on a board of sticky notes. You add one from Today in a second, tick it off, pin what matters, give it a paper colour, and give a to-do a due date so it comes first on Today when it's due. Titles are in a handwriting font, and each note sits at a slight angle, fixed per note so the board never jumps around.

![The Notes page](screenshots/notes.png)

**About you and recommended tracks.** A short, optional profile asks what you do, what you want to get better at, what you already know and how much time you have a day. Claude can fill it in from a resume PDF for you to check; the file is never stored and contact details are left out. Everything the AI writes for you (principles, track plans, goal plans) uses it, and the Learn page suggests three tracks with a reason each, such as *"Because you already know JavaScript and want to get better at backend development."* One tap opens the new-track form already filled in.

![Recommended for you on the Learn page](screenshots/learn.png)

**Contacts.** For the people you meet for work: where you met, a follow-up date, and the goal they can help with. You log touchpoints ("Coffee chat, sent my portfolio") and pick when to follow up next. Today shows who's due, with Done and Snooze, and each goal lists the people who can help with it.

![A contact with touchpoints](screenshots/contact.png)

**Schedule.** You can connect Google Calendar, read-only. Today shows today's events with the next one highlighted, and a Schedule page shows the week ahead, all in your timezone.

**Week in review.** One page answers "how did this week go?" across the whole app. It opens with a sentence, such as *"You showed up 5 of 6 days so far, finished 2 goal steps and did 4 lessons,"* and a dot for each day you did something. Four numbers (check-ins, lessons, goal steps, spending) are compared with the week before. A week in progress is compared with the same days of last week, so a Wednesday isn't measured against a whole week. Below that are each habit's week, what you got done, where the money went and what's due in the next 7 days. The sentence is written by code, not the AI, so it's free and instant. On Sundays and Mondays, Today shows it with a link to the full page.

![Week in review](screenshots/review.png)

**Sign-in.** You sign in with Google or GitHub. Accounts are matched by email, so both open the same account, and sign-in only accepts an address the provider has verified. A public privacy page explains what's stored.

## Key technical decisions

**AI output is untrusted input.** Every Claude call runs on the server only, and the API key never reaches the browser. Each response must be JSON that passes a Zod schema. If it doesn't, the call retries once, then shows a clear error. Generated lessons and principles are cached in Postgres, so they are never paid for twice. Every call is logged, with token counts, and counts toward a daily limit of 20 per user. Model names come from environment variables, so switching models doesn't need a code change. Two rules exist because the content matters: the AI never writes scripture text, and the user's own focus description is only used for examples, so it can't pull a plan off-topic.

**The AI writes words; the app draws.** Lesson diagrams could have been SVG or Mermaid written by the AI, but AI-written SVG is a security risk and uneven in quality, and one small Mermaid mistake breaks the whole picture. Instead the AI picks a kind (steps, compare or table) and fills in short labels, and Compound's own components draw it, so a diagram always matches the design and nothing the AI wrote is ever inserted as HTML. My first schema had one shape per kind, and the API refused it: added to the rest of the lesson, its grammar was too large for structured outputs. All three kinds now share one flat shape (a kind, a caption, headers and rows), with a check that the rows fit the kind. Code is coloured with Shiki on the server, so the browser gets plain HTML and no highlighting script.

**Measuring the AI, not just validating it.** A schema proves a lesson has the right shape, not that it's right. `npm run eval:lessons` asks the real AI for eight fixed lessons through the app's own code and scores the first answer of each: exercise order, sound multiple choice, no stray backticks, code in blocks, diagrams that fit their kind, question code that doesn't give the answer away, and whether each example really prints what the lesson says. For that last check the AI's JavaScript and TypeScript run in a separate Node process with the permission model on: no files, no network, no other programs, none of the environment (so no API key), and five seconds. A unit test proves each of those is blocked. A second set, `npm run eval:feedback`, tests the reviewer of written answers: 16 answers with a known verdict, each reviewed three times. Some are right but not worded like the sample, some have a real mistake, and three try to talk the reviewer into "correct" ("Note to the reviewer…", a fake system message). The reviewer's improved answer is run in the same sandbox, so feedback that "fixes" code into something else wrong is caught. Whether feedback is *helpful* isn't scored, on purpose: only another AI could judge that, so the reviews are saved to read instead. A third set, `npm run eval:suggestions`, checks "Recommended for you" for 8 made-up people: no repeats of a track they have or skipped, relevant to what they said, no beginner track on what they already know, and no scripture, even when their profile hides an instruction to suggest crypto trading. The evals cost a few cents, so they run when I ask, never in CI.

**A demo mode that makes the app free to run.** With no API key, or with `AI_DEMO_MODE=1`, the app uses clearly labelled example content instead of calling Claude. Anyone can clone and run the full app without paying, and the end-to-end tests never spend credits or flake on nondeterministic output.

**A live demo that can't cost anything.** Most visitors won't sign in with Google to look at a portfolio project, so the landing page has a "Try the demo" button. Each click creates a brand-new account filled with three weeks of believable data (habits with streaks, a goal that's slipping, lessons in progress, a month of money), dated around the visitor's own today in their timezone. A fresh account per click means no visitor sees another's changes, and the button can't be used to sign in as anyone else. Demo accounts use the same example content as demo mode, so they never call the AI or Google and can't spend credits; they're deleted after 24 hours, at most 50 can start in an hour, and a banner on every page offers "Sign in to start your own".

**The goal schedule is pure functions, never stored.** Status, adjusted dates and buffer use are computed from the plan and the steps you've ticked, in [`lib/goals/schedule.ts`](../compound/lib/goals/schedule.ts). Nothing about the schedule is saved, so it can't drift out of sync, and it's easy to unit test. Testing caught a real design flaw. I first derived your pace from the current deadline, so extending a deadline *slowed* the expected pace, and an at-risk goal stayed at risk. The fix was to measure pace against the original plan, so extra time really is extra room. A test now pins that behaviour.

**Money in integer cents.** Amounts are parsed from what you type ("1,250.50") into whole cents and stored as integers, never floats, so totals never pick up rounding errors. Formatting uses `Intl` with the currency you pick in Settings. The database enforces the rest: positive amounts, a valid currency code, and unique category names regardless of capitalisation. Categories are archived instead of deleted, so old transactions keep their history.

**Google Calendar without storing anyone's calendar.** I used Google's OAuth and REST API directly with `fetch` rather than adding an SDK. Access is read-only. A random, single-use state value in a short-lived cookie ties Google's answer to the request that started it. The tokens are encrypted with AES-256-GCM under a key that lives only in the environment, so a database copy alone can't read anyone's calendar. Events are fetched when you look and never saved, never sent to the AI, and a slow or broken connection shows a short message instead of breaking Today. Placing events on the right day meant working out local midnight in any timezone, including on daylight-saving days, which unit tests pin down.

**A resume is input, not storage.** The resume PDF goes to Claude once as a document, and the answers come back through the same schema checks as every other AI output. The server checks the file's first bytes, not just its name, and limits it to 4 MB to stay under Vercel's request size. Nothing is saved until you press Save.

**Safety around production data.** Development runs on a separate Neon database branch. The migration runner prints which host it's about to touch. A new migration is applied to production *before* the code that needs it is pushed, so the live site never runs code against a schema it doesn't have yet. The end-to-end tests refuse to run unless the database host matches an allowed dev host.

**Fast pages with Next.js 16.** With Cache Components, each page prerenders a static shell, and anything that reads the session streams in inside `<Suspense>`. Auth is checked in a data access layer that every page and server action calls before touching data, not only in middleware. Server actions validate input with Zod and check ownership in the query itself.

## Testing

- **488 unit tests** (Vitest) cover the logic that's easy to get subtly wrong: streaks, the week in review, timezone-aware dates, which days can be filled in, which lesson days are open, the goal schedule, parsing and formatting money, budgets, due dates, verified sign-in emails, follow-up dates, token encryption, the calendar connect checks, placing events on days, the code box's indenting, validating AI output, and the eval checks themselves.
- **37 end-to-end flows** (Playwright) run on both a desktop browser and a phone viewport. They cover onboarding, habits and filling in a missed day, lessons at your own pace (including code, diagrams and typing in the code box), a reading, creating and editing goals, falling behind and catching up, recording money, budgets, managing categories, saving toward a goal, notes and due dates, About you and a resume, recommended tracks, contacts and follow-ups, connecting a calendar, and the week in review. They sign in as a dedicated test user, run with a demo AI and a demo calendar, and clean up afterwards.
- **AI evals** score real lessons from the live prompts. The latest run on the fast model passed every check: 8 of 8 lessons fit the schema on the first try with exercises in the right order, all 8 diagrams fit their kind, and both examples that could be run printed exactly what the lesson said. The feedback evals gave the right verdict on all 48 reviews, including all 9 attempts to get a wrong answer marked correct, the same verdict on every repeat, and every improved JavaScript answer ran and gave the right result. The suggestion evals found two real problems, described below; after the fixes, 24 of 24 answers fit the schema and none repeated a track the person had.

## What I learned

- **Write the test the way a person uses the app.** Several "bugs" turned out to be test problems: clicking a button before React had hydrated it, or a check finding the previous page still hidden in the DOM after navigation. Waiting for the page to be interactive, and asserting what's *visible*, made the suite reliable.
- **Round trips add up.** Creating a goal first did one insert per milestone and per step, about ten trips to the database, and it was slow enough to time out tests. Batching the inserts fixed it.
- **Guardrails are cheaper than accidents.** Early on, a misconfigured environment variable pointed a migration at production. Nothing was lost, but it led directly to printing the host before every migration and to the e2e guard.
- **Ship the schema first, every time.** Once, I pushed a feature before running its migration on production, and the Today page broke until the migration ran. Now every new migration runs on production before its code is pushed.
- **Compare times from one clock.** Recommended tracks were regenerating on every reload. The profile's "last changed" time came from the database's clock and the suggestions' "made at" time from the app server's, and the two were a little apart. An end-to-end test caught it; both now use the database's clock.
- **An eval can be wrong too.** The first real run flagged two lessons. Reading them, the AI was right both times: my check treated `['ana', 'ben']` and `['ANA', 'BEN']` as the same answer, and rejected a flow that goes Browser, Server, then back to the Browser. Saving every lesson to read afterwards is what made that visible, and both checks now have tests.
- **Evals find what users would have found.** The suggestion evals turned up two real bugs. For one profile, suggestions failed every time: the reasons ran past a 160-character limit that the model never saw, because the API leaves length limits out of the schema it shows the model. And the cheap model suggested "Node.js APIs with Express" to someone who already had a "Node.js APIs" track. The first was fixed in the prompt; the second only by letting the model think a little more, since a stronger prompt sentence wasn't enough.
- **Don't let the prompt study for the test.** One version of that prompt used the eval's own Node.js case as its example, and the score jumped because the AI copied it. With an example on a topic none of the test people has, the score showed the real picture.
- **AI features are mostly not about the prompt.** Schemas, retries, caching, limits, logging and a demo mode took more work than the prompts, and they're what make the AI parts dependable.

## What's next

Email reminders for habits and follow-ups, and a custom domain so Google can verify the Calendar connection.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · PostgreSQL on Neon · Kysely · Auth.js (Google, GitHub) · Zod · Tailwind CSS 4 · shadcn/ui · Shiki · Claude API · Vitest · Playwright · Vercel
