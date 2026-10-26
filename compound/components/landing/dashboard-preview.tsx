import {
  BookOpen,
  ChartColumn,
  Flame,
  GraduationCap,
  House,
  ListChecks,
  Target,
  Wallet,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { CheckItem, ProgressBar } from "./floating";
import { SectionHeading } from "./section-heading";

// A static picture of the Today page inside a blue frame. It's decorative,
// so screen readers get one short description instead of every mock value.
export function DashboardPreview() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <SectionHeading
        label="Your day at a glance"
        title="Everything for today, on one screen"
        description="Habits to check, a short lesson to finish, and the next step toward your goal."
      />

      <div
        role="img"
        aria-label="Preview of the Compound Today page with habits, a streak, weekly progress, lessons and a goal."
        className="relative mt-12 overflow-hidden rounded-[28px] bg-linear-to-b from-primary to-chart-2 px-3 pt-3 sm:px-10 sm:pt-10"
      >
        <div className="grid overflow-hidden rounded-t-2xl bg-background shadow-tile md:grid-cols-[200px_1fr]">
          <PreviewSidebar />
          <PreviewToday />
        </div>
        {/* Fade the bottom edge into the page, like a screenshot cut off. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />
      </div>
    </section>
  );
}

const NAV = [
  { icon: House, label: "Today", active: true },
  { icon: ListChecks, label: "Habits" },
  { icon: GraduationCap, label: "Learn" },
  { icon: Target, label: "Goals" },
  { icon: Wallet, label: "Money" },
  { icon: ChartColumn, label: "Progress" },
];

function PreviewSidebar() {
  return (
    <aside className="hidden border-r bg-sidebar p-4 md:block">
      <div className="flex items-center gap-2 px-2 font-semibold">
        <LogoMark className="size-5" />
        Compound
      </div>
      <ul className="mt-6 space-y-1 text-sm">
        {NAV.map(({ icon: Icon, label, active }) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              active ? "bg-sidebar-accent font-medium" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function PreviewToday() {
  return (
    <div className="p-5 pb-16 sm:p-8 sm:pb-20">
      <p className="text-sm text-muted-foreground">Today</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        <span className="text-subtle">Good morning,</span> Alex
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <PreviewCard title="Today's habits">
          <ul className="space-y-2.5 text-sm">
            <CheckItem done>Walk 20 minutes</CheckItem>
            <CheckItem done>Read the Bible</CheckItem>
            <CheckItem>Plan tomorrow&apos;s top 3 tasks</CheckItem>
            <CheckItem>Review your numbers</CheckItem>
          </ul>
        </PreviewCard>

        <PreviewCard title="Current streak">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold tabular-nums">12</span>
            <span className="pb-1.5 text-muted-foreground">days</span>
            <Flame className="mb-2 ml-auto size-7 fill-orange-400 text-orange-500" />
          </div>
          <div className="mt-4 flex gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <span
                key={i}
                className={cn(
                  "grid size-7 place-items-center rounded-full text-xs",
                  i < 5 ? "bg-success/15 font-medium text-success" : "bg-secondary text-muted-foreground",
                )}
              >
                {day}
              </span>
            ))}
          </div>
        </PreviewCard>

        <PreviewCard title="This week">
          <div className="flex items-center gap-4">
            <ProgressRing value={83} />
            <dl className="space-y-2 text-sm">
              <Stat label="Habits done" value="29/35" />
              <Stat label="Lessons" value="4/5" />
            </dl>
          </div>
        </PreviewCard>

        <PreviewCard title="Continue learning" className="lg:col-span-2">
          <div className="space-y-4">
            <TrackRow name="Python basics" day="Day 4 of 30" value={13} />
            <TrackRow name="Bible in a year" day="Day 120 of 365" value={33} />
          </div>
        </PreviewCard>

        <PreviewCard title="Goal · Run a 5K">
          <p className="text-3xl font-semibold tabular-nums">68%</p>
          <div className="mt-2">
            <ProgressBar value={68} className="bg-success" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">On track · 6 buffer days left</p>
        </PreviewCard>
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function TrackRow({ name, day, value }: { name: string; day: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <BookOpen className="size-4 text-primary" />
          {name}
        </span>
        <span className="text-xs text-muted-foreground">{day}</span>
      </div>
      <ProgressBar value={value} />
    </div>
  );
}

/** A circular progress ring. `value` is 0–100. */
function ProgressRing({ value }: { value: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 64 64" className="size-20 -rotate-90">
      <circle cx="32" cy="32" r={radius} strokeWidth="7" className="fill-none stroke-secondary" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        className="fill-none stroke-chart-2"
      />
    </svg>
  );
}
