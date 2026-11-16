// Lesson evals: asks the real AI for a fixed set of lessons and scores them
// with the checks in lib/lessons/evals.ts.
//
//   npm run eval:lessons                 every case, on MODEL_FAST
//   npm run eval:lessons -- --smart      on MODEL_SMART, the model lessons use live
//   npm run eval:lessons -- sql-joins    only the named cases
//   npm run eval:lessons -- --no-run     skip running the JavaScript and TypeScript examples
//
// This spends API credits (a few cents on the fast model), so it only runs
// when asked: never in the tests and never on deploy. It doesn't touch the
// database. JavaScript and TypeScript examples are run in a locked-down
// process (see run-code.ts) to check what they print. Each lesson is saved to evals/out/ (gitignored) to read afterwards.
import { mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { generateJson, type MessagesClient } from "../lib/ai/generate";
import { checkLesson, EVAL_CASES, outputCheck, runnableBlocks, summarise, type CheckResult, type EvalCase } from "../lib/lessons/evals";
import { LESSON_SYSTEM_PROMPT, lessonPrompt } from "../lib/lessons/prompts";
import { lessonSchema } from "../lib/lessons/schema";
import { runBlock } from "./run-code";

try {
  process.loadEnvFile(".env.local");
} catch {
  // The environment is provided directly.
}

const args = process.argv.slice(2);
const smart = args.includes("--smart");
const runCode = !args.includes("--no-run");
const wanted = args.filter((arg) => !arg.startsWith("--"));
const modelVariable = smart ? "MODEL_SMART" : "MODEL_FAST";
const model = process.env[modelVariable];
if (!process.env.ANTHROPIC_API_KEY || !model) {
  throw new Error(`Set ANTHROPIC_API_KEY and ${modelVariable} in .env.local to run the evals.`);
}

const unknown = wanted.filter((id) => !EVAL_CASES.some((c) => c.id === id));
if (unknown.length > 0) {
  throw new Error(`Unknown case: ${unknown.join(", ")}. Cases: ${EVAL_CASES.map((c) => c.id).join(", ")}`);
}
const cases = wanted.length > 0 ? EVAL_CASES.filter((c) => wanted.includes(c.id)) : EVAL_CASES;

const OUT = "evals/out";
const CONCURRENCY = 3;
const client = new Anthropic();

type Outcome = {
  testCase: EvalCase;
  /** Checks on the first answer; null when the API call itself failed. */
  checks: CheckResult[] | null;
  /** The learner got a lesson, counting the app's one retry. */
  delivered: boolean;
  outputTokens: number;
  seconds: number;
  error?: string;
};

async function run(testCase: EvalCase): Promise<Outcome> {
  const started = Date.now();
  const answers: string[] = [];
  let outputTokens = 0;
  // The app's own code makes the request, so the eval sends exactly what the
  // app sends. This wrapper only keeps a copy of each raw answer.
  const messages = {
    create: async (...params: Parameters<Anthropic["beta"]["messages"]["create"]>) => {
      const response = (await client.beta.messages.create(...params)) as Anthropic.Beta.BetaMessage;
      answers.push(response.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(""));
      outputTokens += response.usage.output_tokens;
      return response;
    },
  } as unknown as MessagesClient;

  let delivered = false;
  let error: string | undefined;
  try {
    await generateJson(messages, {
      schema: lessonSchema(testCase.type),
      model: model!,
      system: LESSON_SYSTEM_PROMPT,
      prompt: lessonPrompt(testCase),
    });
    delivered = true;
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 200) : String(cause);
  }

  // The first answer is the one that's scored: a retry hides a mistake from
  // the learner, but it's still a mistake, and it costs a second call.
  let checks: CheckResult[] | null = null;
  if (answers.length > 0) {
    let first: unknown = null;
    try {
      first = JSON.parse(answers[0]);
    } catch {
      // Not JSON at all: every check fails on null.
    }
    checks = checkLesson(first, testCase);
    // Run the examples that say what they print, and compare.
    if (runCode) checks.push(outputCheck(runnableBlocks(first).map(runBlock)));
    writeFileSync(`${OUT}/${testCase.id}.json`, JSON.stringify({ model, checks, lesson: first ?? answers[0] }, null, 2));
  }
  return { testCase, checks, delivered, outputTokens, seconds: (Date.now() - started) / 1000, error };
}

mkdirSync(OUT, { recursive: true });
console.log(`Lesson evals: ${cases.length} lessons on ${model}\n`);

const outcomes: Outcome[] = [];
const queue = [...cases];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const outcome = await run(next);
      outcomes.push(outcome);
      const failed = outcome.checks?.filter((r) => r.passed === false) ?? [];
      const status = !outcome.checks ? "ERROR" : failed.length === 0 ? "ok" : `${failed.length} failed`;
      console.log(`  ${outcome.testCase.id.padEnd(14)} ${status.padEnd(9)} ${outcome.seconds.toFixed(0)}s, ${outcome.outputTokens} output tokens`);
      if (outcome.error) console.log(`      ${outcome.error}`);
      // Notes on checks that failed, and on examples that couldn't be run.
      for (const check of outcome.checks ?? []) {
        if (check.passed !== false && check.check !== "output") continue;
        for (const note of check.notes) console.log(`      ${check.check}: ${note}`);
      }
    }
  }),
);

const scored = outcomes.filter((o) => o.checks !== null);
const rows: [string, string][] = [
  ...summarise(scored.map((o) => o.checks!)).map((s): [string, string] => [s.label, s.total === 0 ? "n/a" : `${s.passed} / ${s.total}`]),
  ["Lesson delivered (one retry allowed)", `${outcomes.filter((o) => o.delivered).length} / ${outcomes.length}`],
];
const width = Math.max(...rows.map(([label]) => label.length));
console.log(`\n${"Check".padEnd(width)}  Passed`);
for (const [label, score] of rows) console.log(`${label.padEnd(width)}  ${score}`);
console.log(`\nSaved to ${OUT}/. Output tokens: ${outcomes.reduce((sum, o) => sum + o.outputTokens, 0)}.`);

// A failed API call (bad key, rate limit) is a broken run, not a score.
if (scored.length < outcomes.length) process.exitCode = 1;
