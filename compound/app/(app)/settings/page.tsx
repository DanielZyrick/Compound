import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { signOutAction } from "@/lib/auth/actions";
import { CurrencyForm, DisplayNameForm, TimezoneForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Suspense fallback={<div aria-hidden className="mt-8 h-80 animate-pulse rounded-2xl bg-muted" />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  const user = await requireOnboardedUser();
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
          You sign in with GitHub. Your email and avatar come from your GitHub account.
        </p>
        <DisplayNameForm initial={user.name ?? ""} />
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
    <section className="flex flex-col gap-4 rounded-2xl border p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
