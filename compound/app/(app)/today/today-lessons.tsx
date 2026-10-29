import Link from "next/link";
import { BookOpen, ChevronRight, CircleCheck, GraduationCap, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type TodayLesson = {
  trackId: string;
  trackTitle: string;
  reading: boolean;
  dayNumber: number;
  totalDays: number;
  dayTitle: string;
  done: boolean;
  /** Set when a day was finished today: the next one, open now. */
  keepGoing: number | null;
};

export function TodayLessons({ lessons }: { lessons: TodayLesson[] }) {
  const doneCount = lessons.filter((l) => l.done).length;

  return (
    <section aria-labelledby="today-learning" className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 id="today-learning" className="font-semibold">
          Today&apos;s learning
        </h2>
        {lessons.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {doneCount} of {lessons.length} done
          </p>
        )}
      </div>

      {lessons.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed p-4 text-sm">
          <p className="text-muted-foreground">No lessons today. Ten minutes a day adds up.</p>
          <Link href="/tracks/new" className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Plus className="size-4" />
            Start a learning track
          </Link>
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {lessons.map((lesson) => (
          <li key={lesson.trackId}>
            <Link
              href={`/tracks/${lesson.trackId}/day/${lesson.dayNumber}`}
              className="flex items-center gap-3 rounded-xl p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  lesson.done ? "bg-success text-white" : "bg-primary/10 text-primary",
                )}
              >
                {lesson.done ? (
                  <CircleCheck className="size-4" />
                ) : lesson.reading ? (
                  <BookOpen className="size-4" />
                ) : (
                  <GraduationCap className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("line-clamp-2 block font-medium break-words", lesson.done && "text-muted-foreground")}>
                  {lesson.reading ? `Read ${lesson.dayTitle}` : lesson.dayTitle}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {lesson.trackTitle} · Day {lesson.dayNumber} of {lesson.totalDays}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            {lesson.keepGoing && (
              <Link
                href={`/tracks/${lesson.trackId}/day/${lesson.keepGoing}`}
                className="ml-12 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Keep going: day {lesson.keepGoing}
                <ChevronRight className="size-4" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
