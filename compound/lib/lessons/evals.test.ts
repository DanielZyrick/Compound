import { describe, expect, it } from "vitest";
import {
  checkLesson,
  EVAL_CASES,
  EVAL_CHECKS,
  hasStrayBacktick,
  looksLikeCode,
  outputCheck,
  revealsOutput,
  runnableBlocks,
  sameOutput,
  summarise,
  type CheckId,
} from "./evals";
import { lessonPrompt } from "./prompts";

const fence = "```";
const block = { language: "python", filename: null, code: "print(1 + 1)", output: "2", result: null };
const section = (extra: object = {}) => ({ heading: "The idea", paragraphs: ["Use `len(x)` to count."], blocks: [block], figure: null, ...extra });
const mc = (extra: object = {}) => ({
  type: "multiple_choice",
  question: "What does `len('ab')` give?",
  code: null,
  choices: ["`2`", "`ab`", "Nothing"],
  answerIndex: 0,
  explanation: "`len` counts the two characters.",
  ...extra,
});
const open = (extra: object = {}) => ({
  type: "open",
  question: "Write a line that prints the length of `name`.",
  code: null,
  hint: "Start with `print(`.",
  sampleAnswer: `One line:\n${fence}python\nprint(len(name))\n${fence}`,
  ...extra,
});
const lesson = (extra: object = {}) => ({ title: "Lengths", minutes: 10, sections: [section(), section({ blocks: [] })], exercises: [mc(), mc(), open()], ...extra });

const skill = { type: "skill", coding: true } as const;
/** The checks as { id: passed }, so a test can name the one it is about. */
const outcome = (raw: unknown, testCase: { type: "skill" | "thinking"; coding: boolean } = skill) =>
  Object.fromEntries(checkLesson(raw, testCase).map((r) => [r.check, r.passed])) as Record<CheckId, boolean | null>;
const notes = (raw: unknown, check: CheckId) => checkLesson(raw, skill).find((r) => r.check === check)?.notes ?? [];

describe("checkLesson", () => {
  it("passes a good lesson, and skips the checks that don't apply to it", () => {
    expect(outcome(lesson())).toEqual({
      valid: true,
      order: true,
      choices: true,
      backticks: true,
      blocks: true,
      figures: null, // no diagram
      questions: null, // no code on a question
    });
  });

  it("returns one result per check, in the table's order (output is checked by running code)", () => {
    expect(checkLesson(lesson(), skill).map((r) => r.check)).toEqual(EVAL_CHECKS.map((c) => c.id).filter((id) => id !== "output"));
  });

  it("still reports on a lesson that isn't even an object", () => {
    const result = outcome("not a lesson");
    expect(result.valid).toBe(false);
    expect(result.order).toBe(false);
  });

  it("catches exercises in the wrong order for the track", () => {
    expect(outcome(lesson(), { type: "thinking", coding: true }).order).toBe(false);
    expect(outcome(lesson({ exercises: [mc(), open(), open()] }), { type: "thinking", coding: true }).order).toBe(true);
    expect(notes(lesson({ exercises: [open(), mc(), mc()] }), "order")[0]).toContain("expected multiple_choice, multiple_choice, open");
  });

  it("catches repeated choices and an answer that points nowhere", () => {
    expect(outcome(lesson({ exercises: [mc({ choices: ["Yes", " yes", "No"] }), mc(), open()] })).choices).toBe(false);
    expect(outcome(lesson({ exercises: [mc({ choices: ["`x`", "`x` ", "`y`"] }), mc(), open()] })).choices).toBe(false);
    // In code, case is a real difference.
    expect(outcome(lesson({ exercises: [mc({ choices: ["`['ana']`", "`['ANA']`", "`[]`"] }), mc(), open()] })).choices).toBe(true);
    expect(outcome(lesson({ exercises: [mc({ answerIndex: 3 }), mc(), open()] })).choices).toBe(false);
  });

  it("catches a backtick without a partner, wherever it is", () => {
    expect(outcome(lesson({ sections: [section({ paragraphs: ["Use `len(x) to count."] }), section()] })).backticks).toBe(false);
    expect(outcome(lesson({ exercises: [mc({ choices: ["`2", "`ab`", "Nothing"] }), mc(), open()] })).backticks).toBe(false);
    expect(outcome(lesson({ exercises: [mc(), mc(), open({ hint: "Start with print(`." })] })).backticks).toBe(false);
    const figure = { kind: "table", caption: "What `len gives.", headers: ["Value", "Result"], rows: [["a", "1"]] };
    expect(outcome(lesson({ sections: [section({ figure }), section()] })).backticks).toBe(false);
  });

  it("allows a fenced block in a sample answer, but nowhere a sentence goes", () => {
    expect(outcome(lesson()).backticks).toBe(true);
    const fenced = `Like this:\n${fence}python\nx = 1\n${fence}`;
    expect(outcome(lesson({ sections: [section({ paragraphs: [fenced] }), section()] })).backticks).toBe(false);
    expect(outcome(lesson({ exercises: [mc({ question: fenced }), mc(), open()] })).backticks).toBe(false);
    // A fence that never closes is left in the sample answer's text.
    expect(outcome(lesson({ exercises: [mc(), mc(), open({ sampleAnswer: `${fence}python\nprint(1)` })] })).backticks).toBe(false);
  });

  it("wants code lessons to show code in blocks that say what they give", () => {
    const bare = lesson({ sections: [section({ blocks: [] }), section({ blocks: [] })] });
    expect(outcome(bare).blocks).toBe(false);
    // Not a coding lesson: the check doesn't apply.
    expect(outcome(bare, { type: "skill", coding: false }).blocks).toBeNull();
    expect(outcome(lesson({ sections: [section({ blocks: [{ ...block, output: null }] }), section()] })).blocks).toBe(false);
    expect(outcome(lesson({ sections: [section({ blocks: [{ ...block, output: null, result: "Defines x." }] }), section()] })).blocks).toBe(true);
    expect(outcome(lesson({ sections: [section({ blocks: [{ ...block, result: "Prints 2." }] }), section()] })).blocks).toBe(false);
    const inProse = "Here is the loop:\nfor x in xs:\n    print(x)";
    expect(notes(lesson({ sections: [section({ paragraphs: [inProse] }), section()] }), "blocks")).toEqual(["section 1 paragraph 1: code written as a paragraph"]);
  });

  it("checks diagrams fit their kind, repeat nothing, and number two at most", () => {
    const steps = { kind: "steps", caption: "How it runs.", headers: [], rows: [["Read"], ["Print"]] };
    const withFigure = (figure: object) => lesson({ sections: [section({ figure }), section()] });
    expect(outcome(withFigure(steps)).figures).toBe(true);
    expect(outcome(withFigure({ ...steps, rows: [["Read"], ["read"]] })).figures).toBe(false);
    // A round trip may name the same place twice, as long as the steps differ.
    expect(outcome(withFigure({ ...steps, rows: [["Browser", "Sends"], ["Server", "Replies"], ["Browser", "Shows"]] })).figures).toBe(true);
    expect(outcome(withFigure({ ...steps, rows: [["Read"]] })).figures).toBe(false);
    const compare = { kind: "compare", caption: "Two keywords.", headers: ["let", "const"], rows: [["Can change", "Cannot change"]] };
    expect(outcome(withFigure(compare)).figures).toBe(true);
    expect(outcome(withFigure({ ...compare, headers: ["let", "Let"] })).figures).toBe(false);
    expect(outcome(withFigure({ ...compare, rows: [["Block scoped", "block scoped"]] })).figures).toBe(false);
    const three = lesson({ sections: [section({ figure: steps }), section({ figure: steps }), section({ figure: steps })] });
    expect(notes(three, "figures")).toEqual(["3 diagrams in one lesson (at most 2)"]);
  });

  it("catches a question whose code gives the answer away", () => {
    const code = { language: "python", filename: null, code: "print(len('abc'))" };
    expect(outcome(lesson({ exercises: [mc({ code }), mc(), open()] })).questions).toBe(true);
    expect(outcome(lesson({ exercises: [mc({ code: { ...code, output: "3" } }), mc(), open()] })).questions).toBe(false);
    expect(outcome(lesson({ exercises: [mc({ code: { ...code, code: "print(len('abc'))  # Output: 3" } }), mc(), open()] })).questions).toBe(false);
  });
});

describe("helpers", () => {
  it("hasStrayBacktick ignores proper code spans", () => {
    expect(hasStrayBacktick("Use `a` and `b`.")).toBe(false);
    expect(hasStrayBacktick("Use `a` and `b.")).toBe(true);
    expect(hasStrayBacktick("An empty `` pair.")).toBe(true);
  });

  it("looksLikeCode needs several code-like lines, not one sentence", () => {
    expect(looksLikeCode("A loop repeats work; it ends when the list does.")).toBe(false);
    expect(looksLikeCode("First, read the list.\nThen print each item.")).toBe(false);
    expect(looksLikeCode("const a = 1;\nconst b = 2;")).toBe(true);
    expect(looksLikeCode("SELECT name\nFROM users\n  WHERE id = 1")).toBe(true);
  });

  it("revealsOutput spots comments that state the result", () => {
    expect(revealsOutput("print(x)  # prints 3")).toBe(true);
    expect(revealsOutput("console.log(x); // => 3")).toBe(true);
    expect(revealsOutput("SELECT 1; -- returns one row")).toBe(true);
    expect(revealsOutput("total = price * 2  # double it")).toBe(false);
    expect(revealsOutput("print(x)")).toBe(false);
  });
});

describe("checking printed output", () => {
  const js = { language: "JavaScript", filename: null, code: "console.log(1 + 1)", output: "2", result: null };
  const ts = { ...js, language: "ts", code: "const n: number = 3; console.log(n)", output: "3" };

  it("picks the JavaScript and TypeScript examples that claim an output", () => {
    const noOutput = { ...js, output: null, result: "Defines a function." };
    const found = runnableBlocks(lesson({ sections: [section({ blocks: [block, js, noOutput] }), section({ blocks: [ts] })] }));
    // The Python block and the one without output are left out.
    expect(found).toEqual([
      { label: "section 1 block 2", inputType: "module", code: js.code, expected: "2" },
      { label: "section 2 block 1", inputType: "module-typescript", code: ts.code, expected: "3" },
    ]);
    expect(runnableBlocks("not a lesson")).toEqual([]);
  });

  it("ignores line endings and trailing spaces, but not real differences", () => {
    expect(sameOutput("1\n2", "1\r\n2\r\n")).toBe(true);
    expect(sameOutput("a  \nb", "a\nb")).toBe(true);
    expect(sameOutput("4, 10, 16", "4,10,16")).toBe(false);
    expect(sameOutput("  indented", "indented")).toBe(false);
  });

  it("passes when every example that ran printed what the lesson says", () => {
    const [first] = runnableBlocks(lesson({ sections: [section({ blocks: [js] }), section()] }));
    expect(outputCheck([{ block: first, printed: "2\n" }])).toEqual({ check: "output", passed: true, notes: [] });
    const wrong = outputCheck([{ block: first, printed: "3\n" }]);
    expect(wrong.passed).toBe(false);
    expect(wrong.notes).toEqual(['section 1 block 1: says "2", prints "3"']);
  });

  it("doesn't count an example that couldn't run, and doesn't apply with nothing to run", () => {
    const [first] = runnableBlocks(lesson({ sections: [section({ blocks: [js] }), section()] }));
    const skipped = outputCheck([{ block: first, printed: null, problem: "timed out" }]);
    expect(skipped).toEqual({ check: "output", passed: null, notes: ["section 1 block 1: not run (timed out)"] });
    expect(outputCheck([]).passed).toBeNull();
    // One ran and matched, one couldn't run: still a pass, with a note.
    expect(outputCheck([{ block: first, printed: "2" }, { block: first, printed: null, problem: "needs a file" }]).passed).toBe(true);
  });
});

describe("summarise", () => {
  it("counts passes out of the lessons each check applied to", () => {
    const good = checkLesson(lesson(), skill);
    const bad = checkLesson(lesson({ exercises: [open(), mc(), mc()] }), skill);
    const summary = Object.fromEntries(summarise([good, bad]).map((s) => [s.check, `${s.passed}/${s.total}`]));
    expect(summary.order).toBe("1/2");
    expect(summary.backticks).toBe("2/2");
    expect(summary.figures).toBe("0/0"); // applied to neither lesson
  });
});

describe("EVAL_CASES", () => {
  it("has unique ids, covers both kinds of track, and builds a prompt for each", () => {
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length);
    expect(new Set(EVAL_CASES.map((c) => c.type))).toEqual(new Set(["skill", "thinking"]));
    for (const testCase of EVAL_CASES) {
      expect(testCase.earlierDays).toHaveLength(testCase.dayNumber - 1);
      expect(lessonPrompt(testCase)).toContain(`<today>${testCase.dayTitle}`);
    }
  });
});
