import { describe, expect, it } from "vitest";
import type { RunnableBlock } from "../lib/lessons/evals";
import { runBlock } from "./run-code";

// These start real (locked-down) Node processes, so there are only a few.

const js = (code: string): RunnableBlock => ({ label: "block", inputType: "module", code, expected: "" });

describe("runBlock", () => {
  it("returns what JavaScript and TypeScript print", () => {
    expect(runBlock(js('console.log([2, 5, 8].map((p) => p * 2).join(", "))')).printed).toBe("4, 10, 16\n");
    const ts: RunnableBlock = { ...js("const n: number = 3;\nconsole.log(n + 1);"), inputType: "module-typescript" };
    expect(runBlock(ts).printed).toBe("4\n");
  });

  it("keeps the code away from files, the network, other programs and our secrets", () => {
    const probe = `
      import fs from "node:fs";
      import { execSync } from "node:child_process";
      const tried = {};
      try { fs.readdirSync("."); tried.files = "allowed"; } catch (e) { tried.files = e.code; }
      try { execSync("echo hi"); tried.programs = "allowed"; } catch (e) { tried.programs = e.code; }
      // A plain IP address, so this is the connection being refused, not a name lookup.
      try { await fetch("http://127.0.0.1:8080"); tried.network = "allowed"; } catch (e) { tried.network = e.cause?.code ?? e.code ?? "failed"; }
      tried.secrets = Object.keys(process.env).filter((k) => /KEY|SECRET|DATABASE|TOKEN/i.test(k)).length;
      console.log(JSON.stringify(tried));
    `;
    process.env.EVAL_TEST_SECRET_KEY = "do-not-leak";
    const printed = runBlock(js(probe)).printed;
    delete process.env.EVAL_TEST_SECRET_KEY;
    expect(JSON.parse(printed ?? "{}")).toEqual({
      files: "ERR_ACCESS_DENIED",
      programs: "ERR_ACCESS_DENIED",
      network: "ERR_ACCESS_DENIED",
      secrets: 0,
    });
  });

  it("reports code that needs a browser or a file as not run, not as wrong", () => {
    const browser = runBlock(js('document.title = "x";'));
    expect(browser.printed).toBeNull();
    expect(browser.problem).toContain("document is not defined");
    const file = runBlock(js('import fs from "node:fs";\nconsole.log(fs.readFileSync("notes.txt", "utf8"));'));
    expect(file.printed).toBeNull();
  });

  it("shows a crash in the output, so a broken example can't pass", () => {
    const run = runBlock(js('console.log("before");\nnull.length;'));
    expect(run.printed).toContain("before\n[crashed: TypeError");
  });

  it("stops code that never finishes", () => {
    const run = runBlock(js("while (true) {}"));
    expect(run).toMatchObject({ printed: null, problem: "took longer than 5 seconds" });
  }, 10_000);
});
