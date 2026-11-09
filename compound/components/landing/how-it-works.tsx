import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    title: "Pick your focus",
    description: "Choose what matters to you: career, business, faith, health, or your own goal.",
  },
  {
    title: "Do today's small steps",
    description: "Check off your habits, finish a 10-minute lesson, and take one step toward your goal.",
  },
  {
    title: "Watch it compound",
    description: "Streaks grow, lessons stack up, and plans adjust when life gets in the way.",
  },
];

/** Three numbered steps joined by a dashed line, like a plan in a notebook. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 sm:px-6">
      <SectionHeading number="03" label="How it works" title="Start small. Keep going." />

      <ol className="relative mt-12 grid gap-10 md:grid-cols-3">
        {/* From the first circle to the last: each column is (100% - 2 gaps) / 3 wide. */}
        <span
          aria-hidden
          className="absolute top-5 left-5 hidden border-t-2 border-dashed border-primary/30 md:block"
          style={{ right: "calc((100% - 5rem) / 3 - 1.25rem)" }}
        />
        {STEPS.map(({ title, description }, i) => (
          <li key={title} className="relative">
            <span className="grid size-10 place-items-center rounded-full border-2 border-primary bg-background font-heading text-lg font-semibold text-primary">
              {i + 1}
            </span>
            <h3 className="mt-5 font-heading text-xl font-semibold">{title}</h3>
            <p className="mt-2 max-w-xs text-muted-foreground">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
