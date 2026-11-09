import Image, { type StaticImageData } from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";
import goal from "./shots/goal.png";
import habits from "./shots/habits.png";
import learn from "./shots/learn.png";
import notes from "./shots/notes.png";
import schedule from "./shots/schedule.png";

type Feature = {
  name: string;
  title: string;
  points: string[];
  image: StaticImageData;
  alt: string;
};

const FEATURES: Feature[] = [
  {
    name: "Habits",
    title: "Habits that keep score honestly.",
    points: [
      "Choose the days each habit runs. Streaks only count those days.",
      "Missed a check-in? Fill in the last week, and be honest.",
      "See every habit's week at a glance.",
    ],
    image: habits,
    alt: "The Habits page: each habit with its streak and a row of the last seven days.",
  },
  {
    name: "Learn",
    title: "A short lesson every day.",
    points: [
      "Tracks for a skill, a way of thinking, or a Bible reading plan.",
      "Each day brings a lesson and exercises, with feedback on your answers.",
      "Track ideas picked for you, from what you tell Compound about yourself.",
    ],
    image: learn,
    alt: "Learn: a track in progress and three recommended tracks, each with a reason.",
  },
  {
    name: "Goals and Money",
    title: "Goals with a plan, and money behind them.",
    points: [
      "Break a goal into milestones and steps, with buffer days built in.",
      "Fall behind, and the dates move to fit, and tell you why.",
      "Set monthly budgets, and put income toward a savings goal.",
    ],
    image: goal,
    alt: "A goal page: savings progress, a note about being behind, and the plan's first milestone.",
  },
  {
    name: "Schedule and Contacts",
    title: "Your week, and the people in it.",
    points: [
      "See your Google Calendar week next to your plans. Compound only reads it.",
      "Keep notes on the people you meet, and get a nudge to follow up.",
    ],
    image: schedule,
    alt: "The Schedule page: a week of calendar events in a grid.",
  },
  {
    name: "Notes",
    title: "A place for everything else.",
    points: ["Sticky notes and to-dos. Pin what matters, tick off what's done."],
    image: notes,
    alt: "The Notes page: a board of coloured sticky notes, one pinned.",
  },
];

/** One row per part of the app, sides alternating, each with a real screenshot. */
export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 sm:px-6">
      <SectionHeading number="02" label="What's inside" title="Everything that adds up, in one notebook." />

      <div className="mt-14 flex flex-col gap-16 md:gap-24">
        {FEATURES.map((feature, i) => (
          <article key={feature.name} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            <div className={cn(i % 2 === 1 && "md:order-2")}>
              <p className="font-hand text-2xl text-primary">{feature.name}</p>
              <h3 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-balance">{feature.title}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {feature.points.map((point) => (
                  <li key={point} className="flex gap-3 text-muted-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={3} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-tile">
              <Image
                src={feature.image}
                alt={feature.alt}
                placeholder="blur"
                sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
