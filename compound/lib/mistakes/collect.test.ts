import { describe, expect, it } from "vitest";
import { demoLesson } from "@/lib/lessons/demo";
import type { LessonContent } from "@/lib/lessons/schema";
import { collectMistakes, mistakesToReview, type MistakeAttempt, type MistakeDay } from "./collect";

// A demo skill lesson: two multiple-choice exercises (the first choice is
// right in both), then one open question.
const lesson = (dayTitle: string) =>
  demoLesson({ type: "skill", topic: "Python", dayTitle, daySummary: `Learn ${dayTitle}` });
const day = (dayNumber: number, content: LessonContent = lesson(`Day ${dayNumber}`)): MistakeDay => ({
  lessonId: `lesson-${dayNumber}`,
  dayNumber,
  dayTitle: `Day ${dayNumber}`,
  lesson: content,
});
const attempt = (dayNumber: number, exerciseIndex: number, answer: string, isCorrect: boolean | null): MistakeAttempt => ({
  dayNumber,
  exerciseIndex,
  answer,
  isCorrect,
  feedback: isCorrect === null ? null : `Feedback on ${answer}`,
  betterVersion: isCorrect === false ? `Better than ${answer}` : null,
});

describe("collectMistakes", () => {
  it("finds a wrong multiple-choice pick, with the words of both choices and the explanation", () => {
    const days = [day(1)];
    const [mistake, ...rest] = collectMistakes(days, [attempt(1, 1, "1", false)]);
    expect(rest).toHaveLength(0);
    expect(mistake).toMatchObject({
      dayNumber: 1,
      exerciseIndex: 1,
      type: "multiple_choice",
      yourAnswer: "Studying for hours once a month",
      rightAnswer: "Practising a little every day",
      why: days[0].lesson.exercises[1].type === "multiple_choice" ? days[0].lesson.exercises[1].explanation : null,
      fixedLater: false,
    });
  });

  it("ignores right answers and exercises not answered yet", () => {
    expect(collectMistakes([day(1)], [attempt(1, 0, "0", true)])).toEqual([]);
    expect(collectMistakes([day(1)], [])).toEqual([]);
  });

  it("grades multiple choice again, so a look-alike of the right answer isn't a mistake", () => {
    const content = lesson("Day 1");
    const first = content.exercises[0];
    if (first.type !== "multiple_choice") throw new Error("expected multiple choice");
    const lookalike = { ...content, exercises: [{ ...first, choices: ["`x`", "x", "y"] }, ...content.exercises.slice(1)] };
    // Saved as wrong before look-alikes counted; shown as right now.
    expect(collectMistakes([day(1, lookalike)], [attempt(1, 0, "1", false)])).toEqual([]);
  });

  it("skips a pick that isn't one of the choices", () => {
    expect(collectMistakes([day(1)], [attempt(1, 0, "9", false), attempt(1, 1, "two", false)])).toEqual([]);
  });

  it("counts an open answer only when the first try was wrong, and marks a later right try as fixed", () => {
    const mistakes = collectMistakes(
      [day(1), day(2), day(3)],
      [
        attempt(1, 2, "first try", false),
        attempt(1, 2, "second try", true),
        attempt(2, 2, "wrong", false),
        attempt(2, 2, "still wrong", false),
        attempt(3, 2, "right away", true),
        attempt(3, 2, "then wrong", false),
      ],
    );
    expect(mistakes.map((m) => [m.dayNumber, m.yourAnswer, m.fixedLater])).toEqual([
      [2, "wrong", false],
      [1, "first try", true],
    ]);
    expect(mistakes[1]).toMatchObject({
      type: "open",
      why: "Feedback on first try",
      betterVersion: "Better than first try",
      rightAnswer: (day(1).lesson.exercises[2] as { sampleAnswer: string }).sampleAnswer,
    });
  });

  it("never counts ungraded demo answers", () => {
    expect(collectMistakes([day(1)], [attempt(1, 2, "demo answer", null)])).toEqual([]);
  });

  it("lists the newest day first, then exercises in order", () => {
    const mistakes = collectMistakes(
      [day(1), day(3), day(2)],
      [attempt(1, 1, "2", false), attempt(3, 1, "1", false), attempt(3, 0, "3", false), attempt(2, 0, "1", false)],
    );
    expect(mistakes.map((m) => [m.dayNumber, m.exerciseIndex])).toEqual([
      [3, 0],
      [3, 1],
      [2, 0],
      [1, 1],
    ]);
  });
});

describe("mistakesToReview", () => {
  it("leaves out the ones fixed in practice, but only by a right answer", () => {
    const mistakes = collectMistakes(
      [day(1), day(2)],
      [attempt(1, 0, "1", false), attempt(2, 0, "1", false)],
      [
        { lessonId: "lesson-1", exerciseIndex: 0, isCorrect: false },
        { lessonId: "lesson-1", exerciseIndex: 0, isCorrect: true },
        { lessonId: "lesson-2", exerciseIndex: 0, isCorrect: null },
        { lessonId: "lesson-2", exerciseIndex: 1, isCorrect: true },
      ],
    );
    expect(mistakes.map((m) => [m.dayNumber, m.fixedInPractice])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(mistakesToReview(mistakes).map((m) => m.dayNumber)).toEqual([2]);
  });

  it("leaves out the ones fixed later", () => {
    const mistakes = collectMistakes(
      [day(1)],
      [attempt(1, 0, "1", false), attempt(1, 2, "wrong", false), attempt(1, 2, "right", true)],
    );
    expect(mistakes).toHaveLength(2);
    expect(mistakesToReview(mistakes).map((m) => m.exerciseIndex)).toEqual([0]);
  });
});
