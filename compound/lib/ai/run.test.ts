import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// runAiTask must never reach Claude (or even the daily-limit query) for a demo
// user, even when an API key is set. The database and client are mocked so a
// call to either one fails the test.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: () => { throw new Error("demo users must not touch the AI log"); } }),
}));
vi.mock("./config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./config")>()),
  getClient: () => {
    throw new Error("demo users must not call Claude");
  },
}));

const { runAiTask } = await import("./run");

const task = (isDemo: boolean) => ({
  user: { id: "u1", timezone: "UTC", is_demo: isDemo },
  purpose: "test",
  tier: "fast" as const,
  schema: z.object({ answer: z.string() }),
  system: "system",
  prompt: "prompt",
  demo: () => ({ answer: "example" }),
});

describe("runAiTask", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("gives a demo user the example output, even with an API key set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("AI_DEMO_MODE", "");
    await expect(runAiTask(task(true))).resolves.toEqual({ data: { answer: "example" }, source: "demo" });
  });

  it("does try the real AI for a normal user when a key is set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("AI_DEMO_MODE", "");
    // The mocked database throws on the daily-limit check: proof it went past demo mode.
    await expect(runAiTask(task(false))).rejects.toThrow();
  });
});
