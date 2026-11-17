// Feedback evals: sends fixed answers with a known verdict to the real AI
// reviewer, several times each, and scores the reviews with the checks in
// lib/lessons/feedback-evals.ts.
//
//   npm run eval:feedback                     every case, 3 reviews each
//   npm run eval:feedback -- --runs=5         more reviews per case
//   npm run eval:feedback -- sql-aliases      only the named cases
//   npm run eval:feedback -- --no-run         skip running the better versions' JavaScript
//
// It uses MODEL_FAST at low effort, as the app does for feedback. It spends
// API credits (a cent or two a run), so it only runs when asked: never in the
// tests and never on deploy. Reviews are saved to evals/out/feedback/ (gitignored).
import { mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { generateJson } from "../lib/ai/generate";
import {
  betterCheck,
  checkFeedback,
  FEEDBACK_CASES,
  isConsistent,
  summariseFeedback,
  type CaseReviews,
  type FeedbackCase,
} from "../lib/lessons/feedback-evals";
import { FEEDBACK_SYSTEM_PROMPT, feedbackPrompt, feedbackQuestion } from "../lib/lessons/prompts";
import { feedbackSchema, type Feedback } from "../lib/lessons/schema";
import { runBlock } from "./run-code";

try {
  process.loadEnvFile(".env.local");
} catch {
  // The environment is provided directly.
}

const args = process.argv.slice(2);
const runs = Number(args.find((arg) => arg.startsWith("--runs="))?.slice("--runs=".length) ?? 3);
const runCode = !args.includes("--no-run");
const wanted = args.filter((arg) => !arg.startsWith("--"));
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("--runs must be a whole number from 1 to 10.");

const model = process.env.MODEL_FAST;
if (!process.env.ANTHROPIC_API_KEY || !model) throw new Error("Set ANTHROPIC_API_KEY and MODEL_FAST in .env.local to run the evals.");

const unknown = wanted.filter((id) => !FEEDBACK_CASES.some((c) => c.id === id));
if (unknown.length > 0) {
  throw new Error(`Unknown case: ${unknown.join(", ")}. Cases: ${FEEDBACK_CASES.map((c) => c.id).join(", ")}`);
}
const cases = wanted.length > 0 ? FEEDBACK_CASES.filter((c) => wanted.includes(c.id)) : FEEDBACK_CASES;

const OUT = "evals/out/feedback";
const CONCURRENCY = 4;
const client = new Anthropic();

async function review(testCase: FeedbackCase): Promise<{ data: Feedback | null; error?: string }> {
  try {
    const data = await generateJson(client.beta.messages, {
      schema: feedbackSchema,
      model: model!,
      system: FEEDBACK_SYSTEM_PROMPT,
      prompt: feedbackPrompt({
        type: testCase.type,
        level: testCase.level,
        question: feedbackQuestion(testCase),
        reference: testCase.reference,
        answer: testCase.answer,
      }),
      effort: "low",
    });
    return { data };
  } catch (cause) {
    return { data: null, error: cause instanceof Error ? cause.message.slice(0, 200) : String(cause) };
  }
}

async function evaluate(testCase: FeedbackCase): Promise<CaseReviews & { errors: string[] }> {
  const answers = await Promise.all(Array.from({ length: runs }, () => review(testCase)));
  const reviews = answers.map(({ data }) => ({
    isCorrect: data?.isCorrect ?? null,
    results: [
      ...checkFeedback(data, testCase),
      ...(data && runCode ? [betterCheck(testCase, data.betterVersion, runBlock)] : []),
    ],
  }));
  writeFileSync(
    `${OUT}/${testCase.id}.json`,
    JSON.stringify({ model, expected: testCase.expected, answer: testCase.answer, reviews: answers.map((a, i) => ({ ...a, results: reviews[i].results })) }, null, 2),
  );
  return { testCase, reviews, errors: answers.flatMap((a) => (a.error ? [a.error] : [])) };
}

mkdirSync(OUT, { recursive: true });
console.log(`Feedback evals: ${cases.length} answers × ${runs} reviews on ${model}\n`);

const outcomes: Awaited<ReturnType<typeof evaluate>>[] = [];
const queue = [...cases];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const outcome = await evaluate(next);
      outcomes.push(outcome);
      const verdicts = outcome.reviews.map((r) => (r.isCorrect === null ? "?" : r.isCorrect ? "✓" : "✗")).join("");
      const failed = outcome.reviews.flatMap((r) => r.results.filter((x) => x.passed === false));
      const status = failed.length === 0 && isConsistent(outcome.reviews) ? "ok" : "check";
      console.log(`  ${outcome.testCase.id.padEnd(28)} ${outcome.testCase.group.padEnd(8)} verdicts ${verdicts.padEnd(runs + 1)} ${status}`);
      for (const error of outcome.errors) console.log(`      error: ${error}`);
      // Each distinct note once, so three identical misses read as one line.
      for (const note of new Set(failed.flatMap((x) => x.notes.map((n) => `${x.check}: ${n}`)))) console.log(`      ${note}`);
    }
  }),
);

const rows = summariseFeedback(outcomes);
const width = Math.max(...rows.map((r) => r.label.length));
console.log(`\n${"Check".padEnd(width)}  Passed`);
for (const r of rows) console.log(`${r.label.padEnd(width)}  ${r.total === 0 ? "n/a" : `${r.passed} / ${r.total}`}`);
console.log(`\nSaved to ${OUT}/. ✓ marked correct, ✗ marked wrong, ? the call failed.`);

if (outcomes.some((o) => o.errors.length > 0)) process.exitCode = 1;
