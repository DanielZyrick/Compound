import { describe, expect, it } from "vitest";
import { choiceKey, hasLookalikeChoices, isAnswerableSample, isCorrectChoice } from "./choices";

describe("choiceKey", () => {
  it("collapses spaces and drops backticks, the way the page shows a choice", () => {
    expect(choiceKey("`  Hello`")).toBe(choiceKey("`Hello`"));
    expect(choiceKey("`Hello  there`")).toBe("Hello there");
  });

  it("keeps case in code but not in prose", () => {
    expect(choiceKey("`['ana']`")).not.toBe(choiceKey("`['ANA']`"));
    expect(choiceKey("Yes")).toBe(choiceKey("yes"));
  });
});

describe("hasLookalikeChoices", () => {
  it("catches the bug: a choice with leading spaces next to the same word", () => {
    // What a lesson asked about `"  Hello there".split()[0]`: two choices showed as "Hello".
    expect(hasLookalikeChoices(["`  Hello`", "`Hello there`", "`Hello`", "An IndexError is raised"])).toBe(true);
  });

  it("allows choices that really read differently", () => {
    expect(hasLookalikeChoices(["`Hello`", "`Hello there`", "`  Hello` with the spaces kept", "An IndexError is raised"])).toBe(
      false,
    );
  });
});

describe("isCorrectChoice", () => {
  const choices = ["`  Hello`", "`Hello there`", "`Hello`", "An IndexError is raised"];

  it("counts the correct choice", () => {
    expect(isCorrectChoice(choices, 2, 2)).toBe(true);
  });

  it("counts a choice that looks exactly like the correct one", () => {
    expect(isCorrectChoice(choices, 0, 2)).toBe(true);
  });

  it("doesn't count a different choice, or one that doesn't exist", () => {
    expect(isCorrectChoice(choices, 1, 2)).toBe(false);
    expect(isCorrectChoice(choices, 9, 2)).toBe(false);
  });
});

describe("isAnswerableSample", () => {
  const fence = "```";

  it("accepts one code block (with a short lead-in), or a written answer", () => {
    expect(isAnswerableSample(`${fence}python\nprint(1)\n${fence}`)).toBe(true);
    expect(isAnswerableSample(`One line:\n${fence}python\nprint(1)\n${fence}`)).toBe(true);
    expect(isAnswerableSample("I would ask the customer first, because the refund depends on it.")).toBe(true);
  });

  it("refuses two code blocks: two files, which one code box can't hold", () => {
    // The temperature.py and main.py task.
    expect(
      isAnswerableSample(
        `temperature.py:\n${fence}python\ndef f(c):\n    return c\n${fence}\nmain.py:\n${fence}python\nprint(f(1))\n${fence}`,
      ),
    ).toBe(false);
  });
});
