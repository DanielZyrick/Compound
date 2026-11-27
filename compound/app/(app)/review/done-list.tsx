import Link from "next/link";
import { BookOpen, CheckSquare, Flag, Sparkles, Users } from "lucide-react";
import { formatShortDate, weekdayOf } from "@/lib/dates/calendar";
import type { WeekReview } from "@/lib/review/week";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Item = { key: string; href: string; title: string; detail: string; date: string };

/** Everything finished this week, grouped by kind. Empty groups are left out. */
export function DoneList({ done }: { done: WeekReview["done"] }) {
  const groups = [
    {
      label: "Goal steps",
      icon: Flag,
      items: done.steps.map((s, i): Item => ({
        key: `${s.goalId}-${i}`,
        href: `/goals/${s.goalId}`,
        title: s.title,
        detail: s.goalTitle,
        date: s.doneOn,
      })),
    },
    {
      label: "Lessons and readings",
      icon: BookOpen,
      items: done.lessons.map((l): Item => ({
        key: `${l.trackId}-${l.dayNumber}`,
        href: `/tracks/${l.trackId}/day/${l.dayNumber}`,
        title: l.dayTitle,
        detail: `Day ${l.dayNumber} · ${l.trackTitle}`,
        date: l.doneOn,
      })),
    },
    {
      label: "To-dos",
      icon: CheckSquare,
      items: done.todos.map((t): Item => ({ key: t.id, href: "/notes?filter=done", title: t.title, detail: "Ticked off", date: t.doneOn })),
    },
    {
      label: "People",
      icon: Users,
      items: done.touchpoints.map((t, i): Item => ({
        key: `${t.contactId}-${i}`,
        href: `/contacts/${t.contactId}`,
        title: t.name,
        detail: "Kept in touch",
        date: t.happenedOn,
      })),
    },
    {
      label: "Mistakes fixed in practice",
      icon: Sparkles,
      items: done.fixes.map((f, i): Item => ({
        key: `${f.trackId}-${f.dayNumber}-${i}`,
        href: `/tracks/${f.trackId}/mistakes?show=all`,
        title: f.dayTitle,
        detail: `Day ${f.dayNumber} · ${f.trackTitle}`,
        date: f.answeredOn,
      })),
    },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing ticked off this week yet. Goal steps, lessons, to-dos and people you keep in touch with show up here.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      {groups.map(({ label, icon: Icon, items }) => (
        <section key={label} aria-label={label} className="min-w-0 rounded-xl border">
          <h3 className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            {label}
            <span className="ml-auto tabular-nums text-muted-foreground">{items.length}</span>
          </h3>
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-baseline gap-3 px-4 py-2 text-sm outline-none hover:bg-muted focus-visible:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 wrap-break-word">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground" title={formatShortDate(item.date)}>
                    {WEEKDAY[weekdayOf(item.date)]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
