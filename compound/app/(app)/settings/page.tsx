import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { signOutAction } from "@/lib/auth/actions";
import { getConnection } from "@/lib/calendar/google";
import { CalendarSection } from "./calendar-section";
import { CurrencyForm, DisplayNameForm, TimezoneForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Suspense fallback={<div aria-hidden className="mt-8 h-80 animate-pulse rounded-2xl bg-muted" />}>
        <SettingsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SettingsContent({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  const user = await requireOnboardedUser();
  const [calendar, params] = await Promise.all([getConnection(user.id), searchParams]);
  const displayName = user.name ?? user.email;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <Section title="Account">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          You sign in with Google or GitHub. Your email and avatar come from that account, and both open the same Compound account when they use the same email.
        </p>
        <DisplayNameForm initial={user.name ?? ""} />
      </Section>

      <Section title="About you">
        <p className="text-sm text-muted-foreground">
          What you do, what you want to get better at, and how much time you have. Compound uses it to fit principles,
          tracks and goal plans to you.
        </p>
        <Link href="/profile" className={buttonVariants({ variant: "outline", className: "self-start" })}>
          <UserRound />
          Edit About you
        </Link>
      </Section>

      <Section title="Google Calendar">
        <CalendarSection
          available={calendar.available}
          email={calendar.connection ? calendar.connection.google_email : undefined}
          status={typeof params.calendar === "string" ? params.calendar : null}
        />
      </Section>

      <Section title="Time">
        <TimezoneForm initial={user.timezone} />
      </Section>

      <Section title="Money">
        <CurrencyForm initial={user.currency} />
      </Section>

      <Section title="Session">
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            <LogOut />
            Sign out
          </Button>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`settings-${slug(title)}`} className="flex flex-col gap-4 rounded-2xl border p-5">
      <h2 id={`settings-${slug(title)}`} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
