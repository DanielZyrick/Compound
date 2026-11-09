import Image from "next/image";
import { SectionHeading } from "./section-heading";
import today from "./shots/today.png";

/** A real screenshot of Today in a plain browser window. */
export function AppPreview() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <SectionHeading
        number="01"
        label="Your day"
        title="One page for today."
        description="Your habits, your goals' next steps, today's lesson and your calendar, all in one place."
      />
      <div className="mt-10 rounded-3xl border bg-muted bg-grid p-3 sm:p-6 md:p-10">
        <div className="overflow-hidden rounded-xl border bg-card shadow-tile">
          <div aria-hidden className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </span>
            <span className="mx-auto hidden truncate rounded-md bg-background px-3 py-0.5 text-xs text-muted-foreground sm:block">
              compound-nine-chi.vercel.app/today
            </span>
          </div>
          <Image
            src={today}
            alt="The Today page: a greeting, today's numbers, goals with their next step, habits with a week strip, today's calendar events and today's lesson."
            placeholder="blur"
            sizes="(min-width: 1152px) 1050px, 100vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
