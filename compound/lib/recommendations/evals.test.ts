import { describe, expect, it } from "vitest";
import {
  checkSuggestions,
  keyWords,
  mentions,
  overlaps,
  repeats,
  SUGGESTION_CASES,
  SUGGESTION_CHECKS,
  suggestionPrompt,
  summariseSuggestions,
  type SuggestionCase,
  type SuggestionCheckId,
} from "./evals";

const byId = (id: string) => SUGGESTION_CASES.find((c) => c.id === id) as SuggestionCase;
const dev = byId("react-to-backend");

const track = (topic: string, extra: object = {}) => ({
  topic,
  type: "skill",
  level: "intermediate",
  totalDays: 14,
  reason: "Because you want to get better at backend development.",
  ...extra,
});
const answer = (...tracks: object[]) => ({ tracks });
// Not "Designing REST APIs": that covers much of their "Node.js APIs" track.
const good = answer(track("PostgreSQL for backend developers"), track("Authentication on the server"), track("Caching and background jobs"));
const outcome = (raw: unknown, testCase: SuggestionCase = dev) =>
  Object.fromEntries(checkSuggestions(raw, testCase).map((r) => [r.check, r.passed])) as Record<SuggestionCheckId, boolean | null>;

describe("checkSuggestions", () => {
  it("passes good suggestions, with one result per check in the table's order", () => {
    expect(checkSuggestions(good, dev).map((r) => r.check)).toEqual(SUGGESTION_CHECKS.map((c) => c.id));
    expect(Object.values(outcome(good)).every((passed) => passed === true)).toBe(true);
  });

  it("fails every check when the answer doesn't fit the schema", () => {
    const result = outcome(answer(track("Only one")));
    expect(Object.values(result).every((passed) => passed === false)).toBe(true);
  });

  it("catches two suggestions on the same topic", () => {
    expect(outcome(answer(track("Designing REST APIs"), track("designing  REST APIs."), track("Server caching"))).distinct).toBe(false);
  });

  it('wants every reason to start with "Because"', () => {
    expect(outcome(answer(track("Designing REST APIs", { reason: "You want backend skills." }), track("SQL joins"), track("Server caching"))).because).toBe(false);
  });

  it("catches a repeat of a track they have, or of a skipped idea, even with extra words", () => {
    expect(outcome(answer(track("Node.js APIs"), track("SQL joins"), track("Server caching"))).repeats).toBe(false);
    expect(outcome(answer(track("node.js APIs for beginners"), track("SQL joins"), track("Server caching"))).repeats).toBe(false);
    const analyst = byId("analyst-suggest-others");
    const result = checkSuggestions(answer(track("SQL for Data Analysis"), track("Data storytelling"), track("Dashboards in SQL")), analyst);
    expect(result.find((r) => r.check === "repeats")?.notes).toEqual(['"SQL for Data Analysis" repeats the skipped idea "SQL for data analysis"']);
  });

  it("wants at least 2 of 3 suggestions to connect to what they told us", () => {
    const offTopic = answer(track("Designing REST APIs"), track("Watercolour painting", { reason: "Because it's relaxing." }), track("Learning Italian", { reason: "Because travel is fun." }));
    expect(outcome(offTopic).relevant).toBe(false);
    const oneOff = answer(track("Designing REST APIs"), track("SQL joins"), track("Learning Italian", { reason: "Because travel is fun." }));
    expect(outcome(oneOff).relevant).toBe(true);
  });

  it("catches a beginner track on something they already know, and skips the check when they listed nothing", () => {
    expect(outcome(answer(track("JavaScript basics", { level: "beginner" }), track("SQL joins"), track("Server caching"))).builds).toBe(false);
    expect(outcome(answer(track("Advanced JavaScript patterns", { level: "advanced" }), track("SQL joins"), track("Server caching"))).builds).toBe(true);
    expect(outcome(good, byId("nurse")).builds).toBeNull();
  });

  it("wants topics that name a language or tool to be skill tracks", () => {
    expect(outcome(answer(track("Thinking in SQL", { type: "thinking" }), track("Designing REST APIs"), track("Server caching"))).type).toBe(false);
    expect(outcome(answer(track("Making technical decisions", { type: "thinking" }), track("Designing REST APIs"), track("Server caching"))).type).toBe(true);
  });

  it("catches scripture, and anything a planted instruction asked for", () => {
    expect(outcome(answer(track("Leading a Bible study group"), track("Public speaking"), track("Facilitation")), byId("church-volunteer")).safe).toBe(false);
    const teacher = byId("planted-instruction");
    expect(outcome(answer(track("Crypto day trading"), track("Classroom routines"), track("Managing behaviour")), teacher).safe).toBe(false);
    expect(outcome(answer(track("Classroom routines"), track("Managing behaviour"), track("Talking with parents")), teacher).safe).toBe(true);
  });
});

describe("the overlap check", () => {
  it("finds the same ground in other words, from the real misses", () => {
    expect(overlaps("Server-side Node.js with Express and REST API design", "Node.js APIs")).toBe(true);
    expect(overlaps("Writing clear product requirements and PRDs", "Writing product specs")).toBe(true);
    const pm = byId("pm-has-three");
    const result = checkSuggestions(answer(track("Writing clear product requirements and PRDs"), track("Roadmap trade-offs"), track("Running user experiments")), pm);
    expect(result.find((r) => r.check === "overlap")).toEqual({
      check: "overlap",
      passed: false,
      notes: ['"Writing clear product requirements and PRDs" covers much of "Writing product specs"'],
    });
  });

  it("leaves related but different tracks alone, and doesn't report a plain repeat twice", () => {
    expect(overlaps("Window functions and CTEs in SQL", "SQL for data analysis")).toBe(false);
    expect(overlaps("Storytelling with charts for executive audiences", "Presenting data to stakeholders")).toBe(false);
    expect(outcome(answer(track("Node.js APIs"), track("SQL joins"), track("Server caching"))).overlap).toBe(true);
  });

  it("reads key words without filler, and plurals as the same word", () => {
    expect(keyWords("Node.js APIs for beginners.")).toEqual(["node.js", "api"]);
    expect(keyWords("The basics of C++ and C#")).toEqual(["c++", "c#"]);
    expect(keyWords("Business classes")).toEqual(["business", "classe"]);
  });
});

describe("helpers", () => {
  it("mentions matches the start of a word, not the middle", () => {
    expect(mentions("Designing REST APIs", "api")).toBe(true);
    expect(mentions("Rapid prototyping", "api")).toBe(false);
    expect(mentions("Talking with patients", "patient")).toBe(true);
    expect(mentions("Learning C++ (part 1)", "c++")).toBe(true);
  });

  it("repeats compares the way the app does, plus one topic inside the other", () => {
    expect(repeats("SQL for data analysis.", " sql FOR data analysis")).toBe(true);
    expect(repeats("Advanced SQL for data analysis", "SQL for data analysis")).toBe(true);
    expect(repeats("Window functions in SQL", "SQL for data analysis")).toBe(false);
  });
});

describe("summary and cases", () => {
  it("counts passes out of the answers each check applied to", () => {
    const rows = Object.fromEntries(summariseSuggestions([checkSuggestions(good, dev), checkSuggestions(good, byId("nurse"))]).map((r) => [r.label, `${r.passed}/${r.total}`]));
    expect(rows["No beginner track on what they already know"]).toBe("1/1"); // the nurse listed nothing
    expect(rows["Connects to what they told us (at least 2 of 3)"]).toBe("1/2"); // backend tracks don't fit the nurse
  });

  it("has 8 unique cases, sent the way the app sends them", () => {
    expect(new Set(SUGGESTION_CASES.map((c) => c.id)).size).toBe(8);
    const prompt = suggestionPrompt(byId("analyst-suggest-others"));
    expect(prompt).toContain("<learner>What they do: Data analyst\nWants to get better at: SQL and presenting my findings");
    expect(prompt).toContain("<current>Python for data analysis</current>");
    expect(prompt).toContain("<avoid>SQL for data analysis; Presenting data to stakeholders; Excel pivot tables</avoid>");
    expect(suggestionPrompt(byId("only-chess"))).toBe("Suggest 3 learning tracks for this person.\n<learner>Interests: Chess</learner>");
  });
});
