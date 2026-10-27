import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "./errors";
import { generateJson, type AiAttempt, type MessagesClient } from "./generate";

const schema = z.object({ answer: z.int().min(1) });

/** A response the fake API returns: a text block plus stop reason and usage. */
function reply(text: string, stop_reason = "end_turn") {
  return {
    content: [{ type: "text", text }],
    stop_reason,
    stop_details: null,
    usage: { input_tokens: 100, output_tokens: 20 },
  };
}

/** A fake messages client that returns (or throws) the given results in order. */
function fakeClient(...results: Array<ReturnType<typeof reply> | Error>) {
  const create = vi.fn();
  for (const result of results) {
    if (result instanceof Error) create.mockRejectedValueOnce(result);
    else create.mockResolvedValueOnce(result);
  }
  return { client: { create } as unknown as MessagesClient, create };
}

function run(client: MessagesClient, attempts: AiAttempt[] = []) {
  return generateJson(client, {
    schema,
    model: "test-model",
    system: "Answer with JSON.",
    prompt: "What is 2 + 2?",
    onAttempt: (a) => void attempts.push(a),
  });
}

describe("generateJson", () => {
  it("returns the validated output on the first try", async () => {
    const { client, create } = fakeClient(reply('{"answer": 4}'));
    const attempts: AiAttempt[] = [];

    await expect(run(client, attempts)).resolves.toEqual({ answer: 4 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(attempts).toEqual([{ model: "test-model", ok: true, inputTokens: 100, outputTokens: 20 }]);
  });

  it("sends the schema, a cacheable system prompt, and the refusal fallback", async () => {
    const { client, create } = fakeClient(reply('{"answer": 4}'));
    await run(client);

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("test-model");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toContain("server-side-fallback-2026-07-01");
  });

  it("retries once when the output doesn't match the schema", async () => {
    const { client, create } = fakeClient(reply('{"answer": 0}'), reply('{"answer": 4}'));
    const attempts: AiAttempt[] = [];

    await expect(run(client, attempts)).resolves.toEqual({ answer: 4 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(attempts.map((a) => a.ok)).toEqual([false, true]);
  });

  it("retries once when the output is cut off", async () => {
    const { client } = fakeClient(reply('{"ans', "max_tokens"), reply('{"answer": 4}'));
    await expect(run(client)).resolves.toEqual({ answer: 4 });
  });

  it("gives up with invalid_output after two bad answers", async () => {
    const { client, create } = fakeClient(reply("not json"), reply('{"answer": "four"}'));

    await expect(run(client)).rejects.toMatchObject({ code: "invalid_output" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("does not retry a refusal", async () => {
    const { client, create } = fakeClient(reply("", "refusal"));
    const attempts: AiAttempt[] = [];

    await expect(run(client, attempts)).rejects.toMatchObject({ code: "refused" });
    expect(create).toHaveBeenCalledTimes(1);
    expect(attempts[0].ok).toBe(false);
  });

  it("turns API errors into AiErrors without retrying", async () => {
    const rateLimited = new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers());
    const { client, create } = fakeClient(rateLimited);
    const attempts: AiAttempt[] = [];

    const error = await run(client, attempts).catch((e) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe("busy");
    expect(error.userMessage).toMatch(/busy/);
    expect(create).toHaveBeenCalledTimes(1);
    expect(attempts).toEqual([{ model: "test-model", ok: false, inputTokens: null, outputTokens: null }]);
  });

  it("reports a bad API key as not configured", async () => {
    const unauthorized = new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers());
    const { client } = fakeClient(unauthorized);
    await expect(run(client)).rejects.toMatchObject({ code: "not_configured" });
  });
});
