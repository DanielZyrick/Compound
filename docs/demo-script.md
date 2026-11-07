# Compound demo video script

About 3 minutes. A screen recording with voice-over. Say the lines naturally; they don't need to be word for word.

## Before you record

- [ ] **Real AI on.** Use the live site with the Vercel AI variables set, or `npm run dev` locally with your key. Check that the Learn page's suggestions have no "Example" badge.
- [ ] **Recording locally (easiest):** `npm run demo:seed` fills your dev account with everything below, and starting the dev server with `CALENDAR_DEMO_MODE=1` shows a demo calendar instead of your real events. See "Recording locally" at the end.
- [ ] **Or a prepared account on the live site.** Sign in a day or two early and set things up so the app looks lived-in:
  - 3 habits with a few days of check-ins (e.g. Read 20 pages, Walk 30 minutes, Write for 15 minutes)
  - one habit with **yesterday left unticked**, to fill in live
  - a goal "Get a backend developer job" with a few steps done, and "Build a ₱50,000 emergency fund" with a savings target
  - **About you** filled in (or filled in from your resume), so Learn shows real suggestions
  - 3–4 contacts, one with a follow-up **due today** and linked to the job goal, with a touchpoint or two
  - **Google Calendar connected**, with a few events today and this week
  - a week or two of expenses and one salary, monthly budgets on Food, Transport and Fun, and 4–5 notes in different colours
- [ ] **Leave for the recording:** today's check-in on one habit, and no new track yet (you'll start one live).
- [ ] **Browser:** a clean window, no bookmarks bar, zoom 110–125% so text is readable, 1920×1080 recording.
- [ ] **Quiet:** turn off notifications. Close other tabs.
- [ ] **Do a dry run.** AI calls take about 10 seconds. You can talk over the wait or cut it in editing.

## Script

| Time | On screen | Say |
| --- | --- | --- |
| 0:00 | Landing page, scroll slowly once | "This is Compound, a web app for getting one percent better every day. Habits, learning, goals, people, money and my calendar in one place, so I can see small daily steps add up." |
| 0:15 | Sign in, land on **Today**; point at the Schedule and Follow up cards | "Everything starts on Today: my calendar, the next steps on my goals, my habits, today's lesson, and who I should follow up with." |
| 0:28 | Tick the unchecked habit, show the streak | "I check off a habit, and the streak updates. Streaks are calculated from the check-in history, never stored." |
| 0:35 | **Habits**, tap yesterday on the habit you left unticked | "If I forgot yesterday, I can fill in any day from the last week. The app asks me to be honest." |
| 0:42 | **Learn**: point at **Recommended for you**, then **Start this** on one | "Compound knows what I do and what I want to get better at, so it suggests tracks with a reason. One tap fills in the form." |
| 0:52 | Create track, the plan appears, open Day 1 | "Claude drafts the plan. Every AI response has to pass a schema before it's saved, and lessons are cached so they're never paid for twice." |
| 1:05 | Answer a multiple-choice question, then a written one, Get feedback | "Multiple choice is graded on the server. Written answers get feedback and a better version." |
| 1:20 | **Goals**, open the job goal; point at the status, the adjusted dates and "People who can help" | "Goals get an AI plan with buffer days. I'm a little behind, so the dates moved to fit. And here are the people who can help with this goal." |
| 1:38 | Click the contact; **Log a touchpoint**: "Coffee chat, sent my portfolio", In 2 weeks, Save | "Contacts are for the people I meet for work. I log that we talked and when to follow up, and Today reminds me." |
| 1:55 | **Schedule** in the sidebar; click › for next week, then **Today** | "My Google Calendar is connected, read-only: the week as a grid, with overlapping events side by side and a line at the current time. Events are fetched when I look and never stored, and the tokens are encrypted." |
| 2:08 | **Money**: add an expense, 185, Food, "Lunch"; point at "left in Food this month", then the Budget summary and bars | "Money is quick on purpose: amount, category, done. Food has a monthly budget, so it tells me what's left right away, and the month shows whether I'm on pace." |
| 2:22 | **Notes**: type "Buy running socks", Enter | "And quick notes for everything else, on a board of sticky notes." |
| 2:28 | **About you**: point at "Fill in from your resume" | "All of this is personal because of a short profile. I can even fill it in from my resume; the file isn't stored." |
| 2:38 | Resize the window narrow, or switch to the phone recording; tap through Today and Schedule | "It's built for the phone too." |
| 2:45 | GitHub README | "Under the hood: Next.js 16, Postgres, TypeScript and the Claude API, with over 300 unit tests and end-to-end tests on desktop and mobile. The links are below. Thanks for watching." |

## After recording

- Trim AI waiting time to a second or two, or add a "10 seconds later" cut.
- Add captions; many people watch muted.
- Blur anything private in your real calendar and contacts, or use demo names.
- Use the Today screenshot as the thumbnail, with the title "Compound — small daily steps".
- Put the video link in the README and the write-up.
