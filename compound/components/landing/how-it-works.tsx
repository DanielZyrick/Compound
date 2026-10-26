import { CalendarCheck, Target, TrendingUp } from "lucide-react";
import { FloatingTile } from "./floating";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: Target,
    title: "Pick your focus",
    description: "Choose what matters to you: career, business, faith, health, or your own goal.",
  },
  {
    icon: CalendarCheck,
    title: "Do today's small steps",
    description: "Check off your habits, finish a 10-minute lesson, and take one step toward your goal.",
  },
  {
    icon: TrendingUp,
    title: "Watch it compound",
    description: "Streaks grow, lessons stack up, and plans adjust when life gets in the way.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 sm:px-6">
      <SectionHeading label="How it works" title="Start small. Keep going." />

      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }, i) => (
          <li key={title} className="flex flex-col items-center text-center">
            <FloatingTile className="size-14">
              <Icon className="size-6 text-primary" />
            </FloatingTile>
            <p className="mt-5 text-sm text-muted-foreground">Step {i + 1}</p>
            <h3 className="mt-1 text-lg font-semibold">{title}</h3>
            <p className="mt-2 max-w-xs text-muted-foreground">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
