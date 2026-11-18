import { describe, expect, it } from "vitest";
import { betterCheck, FEEDBACK_CASES } from "../lib/lessons/feedback-evals";
import { runBlock, SANDBOXED } from "./run-code";

// The JavaScript cases' own data, checked in the real sandbox: each sample
// answer must pass its case's run check, and each wrong answer must fail it.
// If this fails, the case is wrong, not the AI. Skipped below Node 25, where
// the sandbox refuses to run code.

const fence = "```";
const jsCases = FEEDBACK_CASES.filter((c) => c.run);

describe.skipIf(!SANDBOXED)("JavaScript feedback cases", () => {
  it.each(jsCases.map((c) => [c.id, c]))("%s: the sample answer passes the run check", (_, testCase) => {
    expect(betterCheck(testCase, testCase.reference, runBlock)).toEqual({ check: "better", passed: true, notes: [] });
  });

  it.each(jsCases.filter((c) => c.group !== "correct").map((c) => [c.id, c]))(
    "%s: the learner's wrong answer fails it",
    (_, testCase) => {
      const answer = `${fence}javascript\n${testCase.answer}\n${fence}`;
      expect(betterCheck(testCase, answer, runBlock).passed).toBe(false);
    },
  );

  it.each(jsCases.filter((c) => c.group === "correct").map((c) => [c.id, c]))(
    "%s: the learner's right answer passes it",
    (_, testCase) => {
      const answer = `${fence}javascript\n${testCase.answer}\n${fence}`;
      expect(betterCheck(testCase, answer, runBlock).passed).toBe(true);
    },
  );
});
