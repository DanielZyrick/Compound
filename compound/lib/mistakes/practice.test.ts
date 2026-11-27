import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/lessons/schema";
import {
  demoPractice,
  MAX_PRACTICE_PER_MISTAKE,
  parsePractice,
  practicePrompt,
  practiceSchema,
  practiceState,
} from "./practice";

const choice: Exercise = {
  type: "multiple_choice",
  question: "What does `len([1, 2, 3])` return?",
  code: null,
  choices: ["`3`", "`2`", "`[1, 2, 3]`", "An error"],
  answerIndex: 0,
  explanation: "`len` counts the items in a list.",
};

const open: Exercise = {
  type: "open",
  question: "Write a function that doubles a number.",
  code: null,
  hint: null,
  sampleAnswer: "```python\ndef double(n):\n    return n * 2\n```",
};

describe("practicePrompt", () => {
  const base = {
    trackType: "skill" as const,
    level: "beginner" as const,
    trackTitle: "Python basics",
    topic: "Python",
    details: null,
    earlierQuestions: [],
  };

  it("sends the original, the right answer and the learner's answer, each in tags", () => {
    const prompt = practicePrompt({ ...base, original: choice, wrongAnswer: "`2`" });
    expect(prompt).toContain("Write one multiple_choice practice exercise for a beginner learner on a skill track.");
    expect(prompt).toContain("<original_question>What does `len([1, 2, 3])` return?</original_question>");
    expect(prompt).toContain("<right_answer>`3`</right_answer>");
    expect(prompt).toContain("<why>`len` counts the items in a list.</why>");
    expect(prompt).toContain("<learner_answer>`2`</learner_answer>");
    expect(prompt).not.toContain("<details>");
    expect(prompt).not.toContain("<earlier_practice>");
  });

  it("adds the learner's details and earlier practice questions when there are some", () => {
    const prompt = practicePrompt({
      ...base,
      details: "For spreadsheets at work",
      original: open,
      wrongAnswer: "def double(n): n * 2",
      earlierQuestions: ["Write a function that triples a number."],
    });
    expect(prompt).toContain("<details>For spreadsheets at work</details>");
    expect(prompt).toContain("<example_answer>```python");
    expect(prompt).toContain("<earlier_practice>Write a function that triples a number.</earlier_practice>");
  });
});

describe("practiceSchema", () => {
  const fresh: Exercise = { ...choice, question: "What does `len('abc')` return?" };

  it("accepts a new exercise of the same type", () => {
    expect(practiceSchema(choice).safeParse({ exercise: fresh }).success).toBe(true);
  });

  it("rejects another type, a repeated question, look-alike choices or a bad answerIndex", () => {
    const schema = practiceSchema(choice, ["What does `len('xyz')` return?"]);
    expect(schema.safeParse({ exercise: { ...open, question: "Something new to write." } }).success).toBe(false);
    expect(schema.safeParse({ exercise: { ...fresh, question: "What does len([1, 2, 3]) return?" } }).success).toBe(
      false,
    ); // only backticks differ: the same question on the page
    expect(schema.safeParse({ exercise: { ...fresh, question: "What does `len('xyz')` return?" } }).success).toBe(false);
    expect(schema.safeParse({ exercise: { ...fresh, choices: ["`3`", "3", "`4`"] } }).success).toBe(false);
    expect(schema.safeParse({ exercise: { ...fresh, choices: ["`3`", "`4`", "`5`"], answerIndex: 3 } }).success).toBe(false);
  });

  it("rejects an open task whose example answer has two code boxes", () => {
    const two = { ...open, question: "Write two functions.", sampleAnswer: "```python\na = 1\n```\n```python\nb = 2\n```" };
    expect(practiceSchema(open).safeParse({ exercise: two }).success).toBe(false);
  });
});

describe("demoPractice", () => {
  it("is labelled, passes the schema, and moves the right answer", () => {
    for (const number of [1, 2, 3]) {
      const earlier = [1, 2, 3].filter((n) => n < number).map((n) => demoPractice(choice, n).exercise.question);
      const { exercise } = demoPractice(choice, number);
      expect(practiceSchema(choice, earlier).safeParse({ exercise }).success).toBe(true);
      expect(exercise.question).toContain(`Example practice ${number}`);
      if (exercise.type !== "multiple_choice") throw new Error("expected multiple choice");
      expect(exercise.answerIndex).not.toBe(0);
      expect(exercise.choices[exercise.answerIndex]).toBe("`3`");
    }
  });

  it("keeps an open exercise open, with its example answer", () => {
    const { exercise } = demoPractice(open, 1);
    expect(practiceSchema(open).safeParse({ exercise }).success).toBe(true);
    expect(exercise).toMatchObject({ type: "open", sampleAnswer: open.sampleAnswer });
  });

  it("stays within the question's length limit", () => {
    const long = { ...choice, question: "x".repeat(300) };
    expect(practiceSchema(long).safeParse(demoPractice(long, 1)).success).toBe(true);
  });
});

describe("parsePractice", () => {
  it("reads a stored exercise, and treats anything else as missing", () => {
    expect(parsePractice(choice)).toEqual(choice);
    expect(parsePractice({ type: "multiple_choice", question: "?" })).toBeNull();
  });
});

describe("practiceState", () => {
  const wrong = { answered: true, isCorrect: false };
  it("is ready with none or only wrong answers, up to the limit", () => {
    expect(practiceState([])).toBe("ready");
    expect(practiceState([wrong])).toBe("ready");
    expect(practiceState(Array(MAX_PRACTICE_PER_MISTAKE).fill(wrong))).toBe("used_up");
  });

  it("waits for an unanswered one, and is fixed by a right answer", () => {
    expect(practiceState([wrong, { answered: false, isCorrect: null }])).toBe("waiting");
    expect(practiceState([wrong, { answered: true, isCorrect: true }])).toBe("fixed");
  });

  it("doesn't count an ungraded demo answer as fixed", () => {
    expect(practiceState([{ answered: true, isCorrect: null }])).toBe("ready");
  });
});
