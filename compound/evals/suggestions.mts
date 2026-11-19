// Suggestion evals: asks the real AI for "Recommended for you" tracks for 8
// made-up people, twice each, and scores the answers with the checks in
// lib/recommendations/evals.ts.
//
//   npm run eval:suggestions                       every case, 2 answers each
//   npm run eval:suggestions -- --runs=3           more answers per case
//   npm run eval:suggestions -- nurse              only the named cases
//   npm run eval:suggestions -- --model=<name>     another model than MODEL_SMART
//   npm run eval:suggestions -- --effort=medium    another effort than the app's
//
// It uses MODEL_SMART at the app's effort (SUGGESTION_EFFORT), as the app does. It spends API credits
// (about a cent a run), so it only runs when asked: never in the tests and
// never on deploy. Answers are saved to evals/out/suggestions/ (gitignored).
import { mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { generateJson } from "../lib/ai/generate";
import {
  checkSuggestions,
  SUGGESTION_CASES,
  suggestionPrompt,
  summariseSuggestions,
  type SuggestionCase,
  type SuggestionResult,
} from "../lib/recommendations/evals";
import { RECOMMEND_SYSTEM_PROMPT, recommendationsSchema, SUGGESTION_EFFORT, type Recommendations } from "../lib/recommendations/recommend";

try {
  process.loadEnvFile(".env.local");
} catch {
  // The environment is provided directly.
}

const args = process.argv.slice(2);
const option = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const runs = Number(option("runs") ?? 2);
const effort = (option("effort") ?? SUGGESTION_EFFORT) as typeof SUGGESTION_EFFORT;
if (!["low", "medium", "high"].includes(effort)) throw new Error("--effort must be low, medium or high.");
const wanted = args.filter((arg) => !arg.startsWith("--"));
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("--runs must be a whole number from 1 to 10.");

const model = option("model") ?? process.env.MODEL_SMART;
if (!process.env.ANTHROPIC_API_KEY || !model) throw new Error("Set ANTHROPIC_API_KEY and MODEL_SMART in .env.local to run the evals.");

const unknown = wanted.filter((id) => !SUGGESTION_CASES.some((c) => c.id === id));
if (unknown.length > 0) {
  throw new Error(`Unknown case: ${unknown.join(", ")}. Cases: ${SUGGESTION_CASES.map((c) => c.id).join(", ")}`);
}
const cases = wanted.length > 0 ? SUGGESTION_CASES.filter((c) => wanted.includes(c.id)) : SUGGESTION_CASES;

const OUT = "evals/out/suggestions";
const CONCURRENCY = 4;
const client = new Anthropic();

type Answer = { data: Recommendations | null; error?: string; results: SuggestionResult[] };

async function ask(testCase: SuggestionCase): Promise<Answer> {
  let data: Recommendations | null = null;
  let error: string | undefined;
  try {
    data = await generateJson(client.beta.messages, {
      schema: recommendationsSchema,
      model: model!,
      system: RECOMMEND_SYSTEM_PROMPT,
      prompt: suggestionPrompt(testCase),
      effort,
    });
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 200) : String(cause);
  }
  return { data, error, results: checkSuggestions(data, testCase) };
}

mkdirSync(OUT, { recursive: true });
console.log(`Suggestion evals: ${cases.length} people × ${runs} answers on ${model}, ${effort} effort\n`);

const all: Answer[] = [];
let failedCalls = 0;
const queue = [...cases];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const testCase = next;
      const answers = await Promise.all(Array.from({ length: runs }, () => ask(testCase)));
      all.push(...answers);
      writeFileSync(`${OUT}/${testCase.id}.json`, JSON.stringify({ model, prompt: suggestionPrompt(testCase), answers }, null, 2));

      const failed = answers.flatMap((a) => a.results.filter((r) => r.passed === false));
      console.log(`  ${testCase.id.padEnd(24)} ${failed.length === 0 ? "ok" : "check"}`);
      answers.forEach((a, i) => {
        if (a.error) {
          failedCalls += 1;
          console.log(`      answer ${i + 1} error: ${a.error}`);
        } else {
          console.log(`      ${i + 1}. ${a.data!.tracks.map((t) => `${t.topic} (${t.type}, ${t.level}, ${t.totalDays}d)`).join(" · ")}`);
        }
      });
      for (const note of new Set(failed.flatMap((r) => r.notes.map((n) => `${r.check}: ${n}`)))) console.log(`      ${note}`);
    }
  }),
);

const rows = summariseSuggestions(all.map((a) => a.results));
const width = Math.max(...rows.map((r) => r.label.length));
console.log(`\n${"Check".padEnd(width)}  Passed`);
for (const r of rows) console.log(`${r.label.padEnd(width)}  ${r.total === 0 ? "n/a" : `${r.passed} / ${r.total}`}`);
console.log(`\nSaved to ${OUT}/.`);

if (failedCalls > 0) process.exitCode = 1;
