import type { Feedback, LessonContent } from "./schema";
import { EXERCISE_MIX } from "./schema";

// Demo mode (no API key): a generic lesson built from the day's plan, and
// feedback that shows the sample answer instead of grading.

type DemoLessonInput = {
  type: keyof typeof EXERCISE_MIX;
  topic: string;
  dayTitle: string;
  daySummary: string;
};

export function demoLesson({ type, topic, dayTitle, daySummary }: DemoLessonInput): LessonContent {
  const name = topic.trim().replace(/[.!?]+$/, "");
  const multipleChoice = (question: string, choices: string[], answerIndex: number, explanation: string) =>
    ({ type: "multiple_choice", question, choices, answerIndex, explanation }) as const;
  const open = (question: string, sampleAnswer: string) =>
    ({ type: "open", question, hint: "There's no single right answer. Be specific.", sampleAnswer }) as const;

  const first = multipleChoice(
    `What is the main goal of today's lesson, "${dayTitle}"?`,
    [daySummary, `Memorise every detail of ${name} at once`, "Skip practice and only read", "Wait until you feel ready"],
    0,
    "Small daily lessons focus on one clear step, then practise it.",
  );
  const second = multipleChoice(
    `Which habit helps most when learning ${name}?`,
    ["Practising a little every day", "Studying for hours once a month", "Only watching others do it"],
    0,
    "Short, regular practice beats rare long sessions: that's the idea behind Compound.",
  );
  const reflect = open(
    `In two or three sentences, describe how you could use today's idea about ${name} this week.`,
    `This week I'll set aside ten minutes a day to practise ${dayTitle.toLowerCase()} on a real example, then note one thing that worked and one thing to improve.`,
  );
  const decide = open(
    `Imagine a friend asks whether to focus on ${name} or something else this month. What would you ask them before answering, and why?`,
    "I'd ask what result they want in a month, how much time they really have each day, and what they've already tried, because the best choice depends on their goal and constraints, not on what's popular.",
  );

  return {
    title: dayTitle,
    minutes: 10,
    sections: [
      {
        heading: "Today's idea",
        paragraphs: [
          daySummary,
          "This is an example lesson: AI isn't connected, so the content is generic. With AI connected, each lesson is written for your topic, level and goal.",
        ],
        code: null,
      },
      {
        heading: "Why small steps work",
        paragraphs: [
          `Learning ${name} is easier in small pieces. One focused idea a day, practised right away, adds up faster than you expect.`,
        ],
        code: null,
      },
    ],
    exercises: type === "skill" ? [first, second, reflect] : [first, decide, reflect],
  };
}

export function demoFeedback(sampleAnswer: string): Feedback {
  return {
    isCorrect: false, // stored as "not graded": the caller saves null for demo attempts
    feedback:
      "Demo mode: answers aren't graded because AI isn't connected. Compare your answer with the example answer below.",
    betterVersion: sampleAnswer,
  };
}
