import Link from "next/link";
import { ChevronRight, CircleCheck, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type TodayLesson = {
  trackId: string;
  trackTitle: string;
  dayNumber: number;
  totalDays: number;
  dayTitle: string;
  done: boolean;
};

export function TodayLessons({ lessons }: { lessons: TodayLesson[] }) {
  const doneCount = lessons.filter((l) => l.done).length;

  return (
    <section className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Today&apos;s lessons</h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {doneCount} of {lessons.length} done
        </p>
      </div>

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
                {lesson.done ? <CircleCheck className="size-4" /> : <GraduationCap className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium", lesson.done && "text-muted-foreground")}>
                  {lesson.dayTitle}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {lesson.trackTitle} · Day {lesson.dayNumber} of {lesson.totalDays}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
