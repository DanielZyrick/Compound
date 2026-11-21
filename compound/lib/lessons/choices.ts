import { parseInline, parseRich } from "./rich-text";

// Rules for what the AI writes in exercises, beyond the shape the schema
// checks. Used when a lesson is generated (generatedLessonSchema), when a
// multiple-choice answer is graded, and by the lesson evals.

/**
 * A choice as the learner sees it. The page collapses runs of spaces, so
 * `"  Hello"` and `"Hello"` look identical: whitespace is collapsed here too,
 * and backticks (which only change the styling) are dropped. Code keeps its
 * case (`['ana']` and `['ANA']` differ); prose doesn't ("Yes" and "yes" don't).
 */
export function choiceKey(choice: string): string {
  const shown = parseInline(choice)
    .map((part) => part.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return choice.includes("`") ? shown : shown.toLowerCase();
}

/** True when two choices would look the same on the page. */
export function hasLookalikeChoices(choices: string[]): boolean {
  return new Set(choices.map(choiceKey)).size !== choices.length;
}

/**
 * Whether a picked choice is right. Picking a choice that looks exactly like
 * the correct one counts too: the learner can't tell them apart, so it isn't
 * their mistake. (New lessons can't have look-alikes; older ones might.)
 */
export function isCorrectChoice(choices: string[], chosen: number, answerIndex: number): boolean {
  if (chosen === answerIndex) return true;
  const picked = choices[chosen];
  const correct = choices[answerIndex];
  return picked !== undefined && correct !== undefined && choiceKey(picked) === choiceKey(correct);
}

/**
 * A code answer is typed into one code box, so its sample answer holds at
 * most one code block: two blocks means two files, which one box can't hold.
 * (The prompt also asks the task not to want words next to the code.)
 */
export function isAnswerableSample(sampleAnswer: string): boolean {
  return parseRich(sampleAnswer).filter((part) => part.type === "code").length <= 1;
}
