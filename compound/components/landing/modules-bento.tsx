import { Flag, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./floating";
import { SectionHeading } from "./section-heading";

export function ModulesBento() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 sm:px-6">
      <SectionHeading
        label="Features"
        title="Three modules, one habit of growth"
        description="Learn, build habits, reach goals, and manage money, all built around small daily steps."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-6">
        <BentoCard
          className="md:col-span-3"
          title="Habits & streaks"
          description="Pick the days that fit your life. Check in daily and watch your streak grow."
          preview={<HabitsPreview />}
        />
        <BentoCard
          className="md:col-span-3"
          title="AI lessons with feedback"
          description="Learning paths for anything, from Python to English. Short daily exercises with instant, specific feedback."
          preview={<LessonPreview />}
        />
        <BentoCard
          className="md:col-span-4"
          title="Goals built to finish"
          description="Goals break down into daily steps, with buffer time before the deadline. Fall behind and the plan adjusts itself."
          preview={<GoalPreview />}
          comingSoon
        />
        <BentoCard
          className="md:col-span-2"
          title="Money, linked to goals"
          description="Track what comes in and goes out. Savings goals show real progress."
          preview={<MoneyPreview />}
          comingSoon
        />
      </div>
    </section>
  );
}

function BentoCard({
  title,
  description,
  preview,
  comingSoon = false,
  className,
}: {
  title: string;
  description: string;
  preview: React.ReactNode;
  comingSoon?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col rounded-3xl border bg-card p-3 shadow-card", className)}>
      <div aria-hidden className="grid min-h-48 place-items-center rounded-2xl bg-muted bg-dots p-5">
        {preview}
      </div>
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {title}
          {comingSoon && <Badge variant="outline">Coming soon</Badge>}
        </h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}

// --- Small UI previews shown inside each card ---

function PreviewPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full max-w-xs rounded-2xl bg-card p-4 shadow-tile", className)}>
      {children}
    </div>
  );
}

function HabitsPreview() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const scheduled = [false, true, true, true, true, true, false];
  return (
    <PreviewPanel>
      <p className="text-sm font-medium">Walk 20 minutes</p>
      <div className="mt-3 flex gap-1.5">
        {days.map((day, i) => (
          <span
            key={i}
            className={cn(
              "grid size-8 place-items-center rounded-full text-xs font-medium",
              scheduled[i] ? "bg-foreground text-background" : "border border-input text-muted-foreground",
            )}
          >
            {day}
          </span>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Flame className="size-4 fill-orange-400 text-orange-500" />
        <span className="font-semibold text-foreground tabular-nums">12</span> weekday streak
      </p>
    </PreviewPanel>
  );
}

function LessonPreview() {
  return (
    <PreviewPanel>
      <p className="text-xs text-muted-foreground">English · Exercise 2 of 3</p>
      <p className="mt-1 text-sm font-medium">Make it present perfect continuous:</p>
      <p className="mt-2 rounded-lg border px-3 py-2 text-sm">I have been studying for two hours.</p>
      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
        Correct! &quot;Have been + -ing&quot; shows an action that is still going on.
      </p>
    </PreviewPanel>
  );
}

function GoalPreview() {
  return (
    <PreviewPanel className="max-w-md">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Run a 5K</span>
        <span className="text-xs text-muted-foreground">Deadline Dec 15</span>
      </div>
      {/* Done steps, planned steps, then buffer days before the deadline flag. */}
      <div className="mt-4 flex h-3 gap-1">
        <div className="w-[45%] rounded-full bg-success" />
        <div className="w-[35%] rounded-full bg-primary/70" />
        <div className="w-[20%] rounded-full bg-[repeating-linear-gradient(45deg,var(--secondary),var(--secondary)_4px,var(--input)_4px,var(--input)_8px)]" />
        <Flag className="-mt-1.5 size-5 shrink-0 text-destructive" />
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <Legend className="bg-success">Done</Legend>
        <Legend className="bg-primary/70">Planned</Legend>
        <Legend className="bg-input">Buffer</Legend>
      </div>
    </PreviewPanel>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {children}
    </span>
  );
}

function MoneyPreview() {
  return (
    <PreviewPanel>
      <p className="text-xs text-muted-foreground">Emergency fund</p>
      <p className="mt-1 font-semibold tabular-nums">
        $1,250 <span className="font-normal text-muted-foreground">/ $2,000</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={62} className="bg-success" />
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        <li className="flex justify-between">
          <span>Saved from salary</span>
          <span className="font-medium text-success tabular-nums">+$150</span>
        </li>
        <li className="flex justify-between">
          <span>Groceries</span>
          <span className="text-muted-foreground tabular-nums">−$42</span>
        </li>
      </ul>
    </PreviewPanel>
  );
}
