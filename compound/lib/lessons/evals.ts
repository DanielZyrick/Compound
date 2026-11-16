import type { TrackLevel } from "@/lib/db/types";
import { parseInline, parseRich } from "./rich-text";
import { EXERCISE_MIX, figureSchema, lessonSchema } from "./schema";

// Evals: checks on the quality of a lesson the AI wrote, beyond "it fits the
// schema". Pure functions over the raw JSON, so they are unit-tested with
// hand-made lessons and cost nothing. The script evals/lessons.mts runs them
// against real AI output (npm run eval:lessons).

export type EvalCase = {
  id: string;
  trackTitle: string;
  topic: string;
  type: keyof typeof EXERCISE_MIX;
  level: TrackLevel;
  dayNumber: number;
  totalDays: number;
  dayTitle: string;
  daySummary: string;
  earlierDays: string[];
  /** A lesson about code: it must show code in blocks. */
  coding: boolean;
};

/** A fixed set of lessons to ask for: five about code, three not, both kinds of track. */
export const EVAL_CASES: EvalCase[] = [
  { id: "python-loops", trackTitle: "Python basics", topic: "Python", type: "skill", level: "beginner", dayNumber: 3, totalDays: 7, dayTitle: "Looping over a list", daySummary: "Use a for loop to do something with every item in a list.", earlierDays: ["Variables and types", "Lists"], coding: true },
  { id: "sql-joins", trackTitle: "SQL for data analysis", topic: "SQL", type: "skill", level: "beginner", dayNumber: 3, totalDays: 7, dayTitle: "Joining two tables", daySummary: "Use INNER JOIN to combine rows from two tables that share a key.", earlierDays: ["SELECT and FROM", "Filtering with WHERE"], coding: true },
  { id: "js-arrays", trackTitle: "JavaScript basics", topic: "JavaScript", type: "skill", level: "beginner", dayNumber: 4, totalDays: 7, dayTitle: "map and filter", daySummary: "Turn one array into another with map, and keep only some items with filter.", earlierDays: ["Values and types", "let and const", "Functions"], coding: true },
  { id: "ts-types", trackTitle: "TypeScript for JavaScript developers", topic: "TypeScript", type: "skill", level: "intermediate", dayNumber: 2, totalDays: 7, dayTitle: "Union types and narrowing", daySummary: "Describe a value that can be one of several types, and narrow it before use.", earlierDays: ["Why types"], coding: true },
  { id: "bash-files", trackTitle: "Command line basics", topic: "Bash", type: "skill", level: "beginner", dayNumber: 1, totalDays: 7, dayTitle: "Moving around and listing files", daySummary: "Use pwd, ls and cd to see where you are and what is there.", earlierDays: [], coding: true },
  { id: "http-request", trackTitle: "How the web works", topic: "HTTP", type: "skill", level: "beginner", dayNumber: 1, totalDays: 7, dayTitle: "What happens when you open a page", daySummary: "Follow one request from the browser to the server and back.", earlierDays: [], coding: false },
  { id: "decisions", trackTitle: "Clear decisions", topic: "Decision making", type: "thinking", level: "intermediate", dayNumber: 2, totalDays: 7, dayTitle: "Reversible and irreversible decisions", daySummary: "Tell apart decisions you can undo from ones you cannot, and spend your time accordingly.", earlierDays: ["What makes a decision hard"], coding: false },
  { id: "feedback", trackTitle: "Giving feedback", topic: "Communication", type: "thinking", level: "beginner", dayNumber: 1, totalDays: 7, dayTitle: "Describe what you saw, not what you think of them", daySummary: "Give feedback about a specific behaviour and its effect, without judging the person.", earlierDays: [], coding: false },
];

export const EVAL_CHECKS = [
  { id: "valid", label: "Fits the schema" },
  { id: "order", label: "Exercises in the right order" },
  { id: "choices", label: "Multiple choice is sound" },
  { id: "backticks", label: "No stray backticks" },
  { id: "blocks", label: "Code is in blocks, with what it gives" },
  { id: "figures", label: "Diagrams fit their kind" },
  { id: "questions", label: "Question code hides the answer" },
] as const;

export type CheckId = (typeof EVAL_CHECKS)[number]["id"];

/** passed is null when the check doesn't apply (e.g. no diagram in the lesson). */
export type CheckResult = { check: CheckId; passed: boolean | null; notes: string[] };

// The lesson is read loosely: it may not fit the schema, and the other checks
// should still say what they can about it.
type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const objects = (value: unknown): Loose[] => list(value).filter(isObject);
const strings = (value: unknown): string[] => list(value).filter((item): item is string => typeof item === "string");
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Runs every check on one lesson, as the AI returned it (parsed JSON). */
export function checkLesson(raw: unknown, testCase: Pick<EvalCase, "type" | "coding">): CheckResult[] {
  const lesson = isObject(raw) ? raw : {};
  const sections = objects(lesson.sections);
  const exercises = objects(lesson.exercises);
  const result = (check: CheckId, notes: string[], applies = true): CheckResult => ({
    check,
    passed: applies ? notes.length === 0 : null,
    notes,
  });

  // 1. The schema, exactly as the app checks it.
  const parsed = lessonSchema(testCase.type).safeParse(raw);
  const valid = result(
    "valid",
    parsed.success ? [] : parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "lesson"}: ${issue.message}`),
  );

  // 2. Exercise types, in the order this kind of track uses.
  const wanted = EXERCISE_MIX[testCase.type].join(", ");
  const got = exercises.map((exercise) => String(exercise.type)).join(", ");
  const order = result("order", got === wanted ? [] : [`expected ${wanted}; got ${got || "none"}`]);

  // 3. Multiple choice: the answer is one of the choices, and no two choices are the same.
  const multipleChoice = exercises.filter((exercise) => exercise.type === "multiple_choice");
  const choiceNotes: string[] = [];
  multipleChoice.forEach((exercise, i) => {
    const choices = strings(exercise.choices).map((choice) => choice.trim().toLowerCase());
    if (new Set(choices).size !== choices.length) choiceNotes.push(`multiple choice ${i + 1}: two choices are the same`);
    const answer = exercise.answerIndex;
    if (typeof answer !== "number" || answer < 0 || answer >= choices.length) {
      choiceNotes.push(`multiple choice ${i + 1}: answerIndex doesn't point at a choice`);
    }
  });
  const choices = result("choices", choiceNotes, multipleChoice.length > 0);

  // 4. Backticks: single ones come in pairs, and fences only appear where a block is allowed.
  const backtickNotes: string[] = [];
  const sentence = (where: string, value: unknown) => {
    const line = text(value);
    if (line === null) return;
    if (line.includes("```")) backtickNotes.push(`${where}: a fenced block inside a sentence`);
    else if (hasStrayBacktick(line)) backtickNotes.push(`${where}: a backtick without a partner`);
  };
  sections.forEach((section, i) => {
    sentence(`section ${i + 1} heading`, section.heading);
    strings(section.paragraphs).forEach((paragraph, j) => sentence(`section ${i + 1} paragraph ${j + 1}`, paragraph));
    for (const cell of figureTexts(section.figure)) sentence(`section ${i + 1} diagram`, cell);
  });
  exercises.forEach((exercise, i) => {
    sentence(`exercise ${i + 1} question`, exercise.question);
    sentence(`exercise ${i + 1} hint`, exercise.hint);
    sentence(`exercise ${i + 1} explanation`, exercise.explanation);
    strings(exercise.choices).forEach((choice, j) => sentence(`exercise ${i + 1} choice ${j + 1}`, choice));
    // A sample answer may hold fenced blocks; the prose around them is checked.
    const sample = text(exercise.sampleAnswer);
    if (sample !== null) {
      for (const part of parseRich(sample)) {
        if (part.type === "text" && (part.text.includes("```") || hasStrayBacktick(part.text))) {
          backtickNotes.push(`exercise ${i + 1} sample answer: an unclosed fence or a stray backtick`);
        }
      }
    }
  });
  const backticks = result("backticks", backtickNotes);

  // 5. A lesson about code shows code in blocks, each saying what it prints or does.
  const blocks = sections.flatMap((section) => objects(section.blocks));
  const blockNotes: string[] = [];
  if (blocks.length === 0) blockNotes.push("a lesson about code has no code block");
  blocks.forEach((block, i) => {
    const output = text(block.output);
    const outcome = text(block.result);
    if (output === null && !outcome?.trim()) blockNotes.push(`block ${i + 1}: neither output nor result`);
    if (output !== null && outcome?.trim()) blockNotes.push(`block ${i + 1}: both output and result`);
  });
  sections.forEach((section, i) => {
    strings(section.paragraphs).forEach((paragraph, j) => {
      if (looksLikeCode(paragraph)) blockNotes.push(`section ${i + 1} paragraph ${j + 1}: code written as a paragraph`);
    });
  });
  const blocksResult = result("blocks", blockNotes, testCase.coding);

  // 6. Diagrams: at most two, each fits its kind, and nothing is repeated.
  const figures = sections.map((section) => section.figure).filter((figure) => figure !== null && figure !== undefined);
  const figureNotes: string[] = [];
  if (figures.length > 2) figureNotes.push(`${figures.length} diagrams in one lesson (at most 2)`);
  figures.forEach((figure, i) => {
    const parsedFigure = figureSchema.safeParse(figure);
    if (!parsedFigure.success) {
      figureNotes.push(`diagram ${i + 1}: ${parsedFigure.error.issues[0]?.message ?? "invalid"}`);
      return;
    }
    const { kind, headers, rows } = parsedFigure.data;
    const firstCells = rows.map((row) => row[0].toLowerCase());
    if (kind === "steps" && new Set(firstCells).size !== firstCells.length) figureNotes.push(`diagram ${i + 1}: two steps have the same label`);
    if (kind !== "steps" && new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
      figureNotes.push(`diagram ${i + 1}: two headers are the same`);
    }
    if (kind === "compare" && rows.some((row) => row[0].toLowerCase() === row[1].toLowerCase())) {
      figureNotes.push(`diagram ${i + 1}: a row says the same thing for both sides`);
    }
  });
  const figuresResult = result("figures", figureNotes, figures.length > 0);

  // 7. Code on a question never shows what it prints: that is the answer.
  const withCode = exercises.filter((exercise) => isObject(exercise.code));
  const questionNotes: string[] = [];
  exercises.forEach((exercise, i) => {
    if (!isObject(exercise.code)) return;
    if ("output" in exercise.code || "result" in exercise.code) questionNotes.push(`exercise ${i + 1}: the question's code carries an output`);
    if (revealsOutput(text(exercise.code.code) ?? "")) questionNotes.push(`exercise ${i + 1}: a comment in the code gives the output away`);
  });
  const questions = result("questions", questionNotes, withCode.length > 0);

  return [valid, order, choices, backticks, blocksResult, figuresResult, questions];
}

/** Every piece of text a diagram shows. */
function figureTexts(figure: unknown): string[] {
  if (!isObject(figure)) return [];
  return [...strings([figure.caption]), ...strings(figure.headers), ...list(figure.rows).flatMap((row) => strings(row))];
}

/** A backtick that is still there after the `code` spans are taken out. */
export function hasStrayBacktick(line: string): boolean {
  return parseInline(line).some((part) => part.type === "text" && part.text.includes("`"));
}

/**
 * Several lines that read as code rather than prose: indented lines, or lines
 * that end the way statements do. One line of prose never counts.
 */
export function looksLikeCode(paragraph: string): boolean {
  const lines = paragraph.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return false;
  const codeLike = lines.filter((line) => /^( {2,}|\t)\S/.test(line) || /[;{}]\s*$/.test(line) || /^\s*(def |class |for .*:$|if .*:$|SELECT |import |const |let |function )/.test(line));
  return codeLike.length >= 2;
}

/** A comment that says what the code prints, e.g. `# Output: 3` or `// prints 3`. */
export function revealsOutput(code: string): boolean {
  return /(#|\/\/|--)\s*(expected\s+)?(output|prints?|result|returns?)\b|(#|\/\/)\s*(=>|->|→)/i.test(code);
}

export type CheckSummary = { check: CheckId; label: string; passed: number; total: number };

/** Per check: how many lessons passed, out of those the check applied to. */
export function summarise(lessons: CheckResult[][]): CheckSummary[] {
  return EVAL_CHECKS.map(({ id, label }) => {
    const results = lessons.flatMap((lesson) => lesson.filter((r) => r.check === id && r.passed !== null));
    return { check: id, label, passed: results.filter((r) => r.passed).length, total: results.length };
  });
}
