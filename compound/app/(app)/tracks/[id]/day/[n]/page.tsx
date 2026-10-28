import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { isDemoMode } from "@/lib/ai/config";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { formatLongDate, todayIn } from "@/lib/dates/calendar";
import { getLessonPage, type LessonAttempt } from "@/lib/lessons/queries";
import { canComplete, isDayOpen, MAX_FEEDBACK_PER_EXERCISE, unlockDate } from "@/lib/lessons/rules";
import type { LessonContent } from "@/lib/lessons/schema";
import { CompleteLesson } from "./complete-lesson";
import { MultipleChoiceExercise, OpenExercise } from "./exercises";
import { StartLesson } from "./start-lesson";

const paramsSchema = z.object({ id: z.uuid(), n: z.coerce.number().int().min(1).max(365) });

export default function LessonPage({ params }: PageProps<"/tracks/[id]/day/[n]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Lesson params={params} />
      </Suspense>
    </main>
  );
}

async function Lesson({ params }: Pick<PageProps<"/tracks/[id]/day/[n]">, "params">) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();
  const { id: trackId, n: dayNumber } = parsedParams.data;

  const user = await requireOnboardedUser();
  const page = await getLessonPage(user.id, trackId, dayNumber, todayIn(user.timezone));
  if (!page) notFound();
  await connection(); // demo mode reads the environment at request time

  const open = isDayOpen(dayNumber, page.currentDay);

  return (
    <>
      <Link
        href={`/tracks/${trackId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {page.trackTitle}
      </Link>
      <p className="mt-4 text-sm text-muted-foreground">
        Day {dayNumber} of {page.total_days}
      </p>
      {/* The plan's day title, so this page matches the plan and the Today card. */}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{page.title}</h1>
      <p className="mt-1 text-muted-foreground">{page.summary}</p>
      {page.lesson && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            <Clock />
            {page.lesson.minutes} min
          </Badge>
          {page.source === "demo" && <Badge variant="outline">Example lesson</Badge>}
        </div>
      )}

      <div className="mt-8">
        {!open ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Lock className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 font-medium">
              This lesson opens on {formatLongDate(unlockDate(page.start_date, dayNumber))}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">One small step a day.</p>
          </div>
        ) : !page.lesson || !page.lessonId ? (
          <StartLesson trackId={trackId} dayNumber={dayNumber} demoMode={isDemoMode()} />
        ) : (
          <div className="flex flex-col gap-8">
            <LessonBody lesson={page.lesson} lessonId={page.lessonId} attempts={page.attempts} />
            <CompleteLesson
              trackId={trackId}
              dayNumber={dayNumber}
              completed={page.completed_at !== null}
              ready={canComplete(page.lesson.exercises.length, page.attempts.map((a) => a.exercise_index))}
              hasHabit={page.habit_id !== null}
              nextOpenDay={
                dayNumber < page.total_days && isDayOpen(dayNumber + 1, page.currentDay) ? dayNumber + 1 : null
              }
            />
          </div>
        )}
      </div>
    </>
  );
}

function LessonBody({
  lesson,
  lessonId,
  attempts,
}: {
  lesson: LessonContent;
  lessonId: string;
  attempts: LessonAttempt[];
}) {
  return (
    <>
      <article className="flex flex-col gap-6">
        {lesson.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph, j) => (
              <p key={j} className="mt-2 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.code && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm">
                <code>{section.code}</code>
              </pre>
            )}
          </section>
        ))}
      </article>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Practice</h2>
        {lesson.exercises.map((exercise, index) => {
          const mine = attempts.filter((a) => a.exercise_index === index);
          if (exercise.type === "multiple_choice") {
            const first = mine[0];
            // The correct answer and explanation are only sent once answered.
            const result = first
              ? {
                  chosen: Number(first.answer),
                  correctIndex: exercise.answerIndex,
                  isCorrect: first.is_correct === true,
                  explanation: exercise.explanation,
                }
              : null;
            return (
              <MultipleChoiceExercise
                key={index}
                lessonId={lessonId}
                index={index}
                question={exercise.question}
                choices={exercise.choices}
                result={result}
              />
            );
          }
          return (
            <OpenExercise
              key={index}
              lessonId={lessonId}
              index={index}
              question={exercise.question}
              hint={exercise.hint}
              attempts={mine.map((a) => ({
                answer: a.answer,
                isCorrect: a.is_correct,
                feedback: a.feedback,
                betterVersion: a.better_version,
              }))}
              remaining={Math.max(0, MAX_FEEDBACK_PER_EXERCISE - mine.length)}
              sampleAnswer={mine.length > 0 ? exercise.sampleAnswer : null}
            />
          );
        })}
      </div>
    </>
  );
}
