import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AiError } from "./errors";

// The one place the app asks Claude for structured data. Claude must answer
// with JSON matching the Zod schema (structured outputs), and the answer is
// validated against the same schema. Invalid or cut-off output is retried
// once, then it's an error.

export type AiAttempt = {
  model: string;
  ok: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type GenerateOptions<Schema extends z.ZodType> = {
  schema: Schema;
  model: string;
  /** Fixed instructions. Keep per-user details out, so the prefix can be cached. */
  system: string;
  /** The request itself, including any per-user details. */
  prompt: string;
  /** A PDF for the model to read with the prompt, base64-encoded (e.g. a resume). */
  pdf?: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Called after every API attempt, successful or not (for logging and limits). */
  onAttempt?: (attempt: AiAttempt) => Promise<void> | void;
};

/** Just the SDK method we use, so tests can pass a fake. */
export type MessagesClient = Pick<Anthropic["beta"]["messages"], "create">;

const MAX_ATTEMPTS = 2; // the first try plus one retry

export async function generateJson<Schema extends z.ZodType>(
  messages: MessagesClient,
  options: GenerateOptions<Schema>,
): Promise<z.infer<Schema>> {
  const { schema, model, system, prompt, pdf, effort = "medium", maxTokens = 16000, onAttempt } = options;
  // Sent to the API as a JSON schema; its parse() validates with the Zod schema.
  const format = betaZodOutputFormat(schema);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await messages.create({
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: pdf
              ? [
                  { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
                  { type: "text", text: prompt },
                ]
              : prompt,
          },
        ],
        output_config: { effort, format },
        // If the model declines for safety reasons, the API retries the same
        // request on a fallback model it picks, inside this one call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (error) {
      await onAttempt?.({ model, ok: false, inputTokens: null, outputTokens: null });
      throw toAiError(error);
    }

    const usage = {
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };

    if (response.stop_reason === "refusal") {
      // The fallback model declined too; asking again won't change that.
      await onAttempt?.({ ...usage, ok: false });
      throw new AiError("refused", `Refused (${response.stop_details?.category ?? "no category"})`);
    }

    const data = response.stop_reason === "end_turn" ? tryParse(format, response) : undefined;
    await onAttempt?.({ ...usage, ok: data !== undefined });
    if (data !== undefined) return data;

    // Cut off (max_tokens) or JSON that doesn't match the schema: retry once.
    if (attempt === MAX_ATTEMPTS) {
      throw new AiError("invalid_output", `No valid output (stop_reason: ${response.stop_reason})`);
    }
  }

  // Unreachable: the loop always returns or throws.
  throw new AiError("invalid_output");
}

/** The response's text, validated against the schema; undefined if it isn't valid. */
function tryParse<T>(format: { parse: (content: string) => T }, response: Anthropic.Beta.BetaMessage) {
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return format.parse(text);
  } catch {
    return undefined;
  }
}

function toAiError(error: unknown): AiError {
  // Most specific first. The SDK has already retried 429s and 5xx errors twice.
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AiError("not_configured", error.message, { cause: error });
  }
  if (error instanceof Anthropic.RateLimitError) return new AiError("busy", error.message, { cause: error });
  if (error instanceof Anthropic.APIError && (error.status === 529 || error.status === 503)) {
    return new AiError("busy", error.message, { cause: error });
  }
  return new AiError("unavailable", String(error), { cause: error });
}
