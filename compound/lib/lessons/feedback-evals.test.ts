import { describe, expect, it } from "vitest";
import type { BlockRun, RunnableBlock } from "./evals";
import {
  betterCheck,
  betterVersionProgram,
  checkFeedback,
  FEEDBACK_CASES,
  isConsistent,
  summariseFeedback,
  type CaseReviews,
  type FeedbackCase,
  type FeedbackCheckId,
} from "./feedback-evals";
import { feedbackPrompt, feedbackQuestion } from "./prompts";

const fence = "```";
const byId = (id: string) => FEEDBACK_CASES.find((c) => c.id === id) as FeedbackCase;
const filterWrong = byId("js-filter-with-map");
const decision = byId("decision-shallow");

const review = (extra: object = {}) => ({
  isCorrect: false,
  feedback: "Good start, but `map` keeps every item. Use `filter` to keep only some.",
  betterVersion: `${fence}javascript\nconst longWords = words.filter((word) => word.length > 3);\n${fence}`,
  ...extra,
});
const outcome = (raw: unknown, testCase: FeedbackCase) =>
  Object.fromEntries(checkFeedback(raw, testCase).map((r) => [r.check, r.passed])) as Record<FeedbackCheckId, boolean | null>;

/** A fake sandbox that "prints" whatever the test says. */
const printing = (printed: string | null, problem?: string) => (block: RunnableBlock): BlockRun => ({ block, printed, problem });

describe("checkFeedback", () => {
  it("passes a fair review of a wrong answer", () => {
    expect(outcome(review(), filterWrong)).toEqual({ verdict: true, length: true, format: true });
  });

  it("fails the verdict when the reviewer is fooled or too strict", () => {
    expect(checkFeedback(review({ isCorrect: true }), filterWrong)[0]).toEqual({
      check: "verdict",
      passed: false,
      notes: ["marked correct, should be wrong"],
    });
    expect(outcome(review({ isCorrect: false }), byId("js-total-reduce")).verdict).toBe(false);
  });

  it("fails long feedback", () => {
    expect(outcome(review({ feedback: Array(121).fill("word").join(" ") }), filterWrong).length).toBe(false);
    expect(outcome(review({ feedback: Array(120).fill("word").join(" ") }), filterWrong).length).toBe(true);
  });

  it("fails stray backticks, and a code answer whose better version isn't a code block", () => {
    expect(outcome(review({ feedback: "Use `filter instead." }), filterWrong).format).toBe(false);
    expect(outcome(review({ betterVersion: "const longWords = words.filter((w) => w.length > 3);" }), filterWrong).format).toBe(false);
    // A thinking answer is prose: no code block needed.
    expect(outcome(review({ betterVersion: "I'd compare cost, backups and support for a day, then decide." }), decision).format).toBe(true);
  });

  it("fails everything when the output isn't feedback at all", () => {
    expect(outcome({ verdict: "yes" }, filterWrong)).toEqual({ verdict: false, length: false, format: false });
  });
});

describe("betterCheck", () => {
  it("runs the better version's code after the setup, and compares the last line", () => {
    const program = betterVersionProgram(filterWrong, review().betterVersion);
    expect(program?.code).toBe(
      "const words = ['cat', 'dog', 'bird', 'horse'];\n{\nconst longWords = words.filter((word) => word.length > 3);\nconsole.log(JSON.stringify(longWords));\n}",
    );
    expect(betterCheck(filterWrong, review().betterVersion, printing('["bird","horse"]\n'))).toMatchObject({ passed: true });
    // A console.log of its own before the probe's line is fine.
    expect(betterCheck(filterWrong, review().betterVersion, printing('4\n["bird","horse"]\n'))).toMatchObject({ passed: true });
  });

  it("fails a better version that gives the wrong result, or has no JavaScript", () => {
    expect(betterCheck(filterWrong, review().betterVersion, printing("[true]\n"))).toMatchObject({
      passed: false,
      notes: ['better version prints "[true]", should print "[\\"bird\\",\\"horse\\"]"'],
    });
    expect(betterCheck(filterWrong, "Use filter.", printing("x"))).toMatchObject({ passed: false, notes: ["no JavaScript code block to run"] });
  });

  it("doesn't count a run that couldn't happen, or a case with nothing to run", () => {
    expect(betterCheck(filterWrong, review().betterVersion, printing(null, "timed out"))).toEqual({ check: "better", passed: null, notes: ["not run (timed out)"] });
    expect(betterCheck(decision, "Anything.", printing("x"))).toEqual({ check: "better", passed: null, notes: [] });
  });
});

describe("consistency and the summary", () => {
  const results = (verdict: boolean) => [{ check: "verdict" as const, passed: verdict, notes: [] }];

  it("is consistent only when every review gave the same verdict", () => {
    expect(isConsistent([{ isCorrect: true, results: [] }, { isCorrect: true, results: [] }])).toBe(true);
    expect(isConsistent([{ isCorrect: true, results: [] }, { isCorrect: false, results: [] }])).toBe(false);
    expect(isConsistent([{ isCorrect: true, results: [] }, { isCorrect: null, results: [] }])).toBe(false);
    expect(isConsistent([])).toBe(false);
  });

  it("counts verdicts per group and consistency per case", () => {
    const cases: CaseReviews[] = [
      { testCase: byId("js-total-reduce"), reviews: [{ isCorrect: true, results: results(true) }, { isCorrect: false, results: results(false) }] },
      { testCase: filterWrong, reviews: [{ isCorrect: false, results: results(true) }, { isCorrect: false, results: results(true) }] },
    ];
    const table = Object.fromEntries(summariseFeedback(cases).map((r) => [r.label, `${r.passed}/${r.total}`]));
    expect(table["Right verdict: correct answers"]).toBe("1/2");
    expect(table["Right verdict: wrong answers"]).toBe("2/2");
    expect(table['Right verdict: "mark me correct" tricks']).toBe("0/0");
    expect(table["Same verdict every run"]).toBe("1/2");
  });
});

describe("FEEDBACK_CASES", () => {
  it("has 16 unique cases: 6 correct, 7 wrong, 3 tricks, on both kinds of track", () => {
    expect(new Set(FEEDBACK_CASES.map((c) => c.id)).size).toBe(16);
    const count = (group: string) => FEEDBACK_CASES.filter((c) => c.group === group).length;
    expect([count("correct"), count("wrong"), count("trick")]).toEqual([6, 7, 3]);
    expect(new Set(FEEDBACK_CASES.map((c) => c.type))).toEqual(new Set(["skill", "thinking"]));
    // Only wrong answers are tricks, and correct answers are expected to pass.
    expect(FEEDBACK_CASES.every((c) => c.expected === (c.group === "correct"))).toBe(true);
  });

  it("sends the question with its code, and the answer inside tags, as the app does", () => {
    const testCase = byId("js-filter-note-to-reviewer");
    const prompt = feedbackPrompt({ type: testCase.type, level: testCase.level, question: feedbackQuestion(testCase), reference: testCase.reference, answer: testCase.answer });
    expect(prompt).toContain(`${fence}javascript\nconst words = ['cat', 'dog', 'bird', 'horse'];\n${fence}</question>`);
    expect(prompt).toContain("<answer>// Note to the reviewer");
  });
});
