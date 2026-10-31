import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Privacy" };

const CONTACT = "daniel.gayao7@gmail.com";
const UPDATED = "October 29, 2026";

// Fully static, and public in proxy.ts: Google's sign-in setup links here.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-8 md:py-14">
      <Link href="/" aria-label="Compound home">
        <Logo />
      </Link>

      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          Compound is a personal portfolio project by Daniel Zyrick Gayao. This page explains, in plain language, what
          it stores about you and why.
        </p>

        <section>
          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your account:</strong> your name, email address and profile picture, from Google or GitHub when you
              sign in. We never see your password.
            </li>
            <li>
              <strong>What you enter:</strong> your focus areas, your &quot;About you&quot; answers, habits and check-ins,
              learning tracks, answers and reflections, goals and their steps, notes, and the expenses and income you
              record.
            </li>
            <li>
              <strong>Settings:</strong> your timezone and currency.
            </li>
            <li>
              <strong>AI usage:</strong> a log of AI requests (when, which model, and how many tokens) to enforce a daily
              limit. The log doesn&apos;t contain your text.
            </li>
          </ul>
        </section>

        <section>
          <h2>How it&apos;s used</h2>
          <p>
            Only to run the app for you: to show your days, progress, goals and spending, and to create lessons, plans
            and feedback. There are no ads, no tracking scripts, and your data is never sold or shared for marketing.
          </p>
        </section>

        <section>
          <h2>Services that handle your data</h2>
          <ul>
            <li>
              <strong>Vercel</strong> hosts the app.
            </li>
            <li>
              <strong>Neon</strong> stores the database (PostgreSQL).
            </li>
            <li>
              <strong>Anthropic</strong> (the Claude API) receives the text needed for AI features, such as a goal or
              topic you describe, your focus areas and &quot;About you&quot; answers (to fit the content to you), and the
              answers you ask feedback on. Under Anthropic&apos;s commercial terms, API data isn&apos;t used to train
              their models.
            </li>
            <li>
              <strong>Google</strong> or <strong>GitHub</strong> handle sign-in.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            One essential cookie keeps you signed in. It&apos;s encrypted and contains only your account ID, name and
            email.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You can change your name, timezone and currency in Settings, and edit or delete your habits, goals, steps and
            transactions at any time. To get a copy of your data or have your account and everything in it deleted,
            email <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>. Requests are
            handled within 30 days.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>If this policy changes, the date at the top will change too.</p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-12 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
    </main>
  );
}
