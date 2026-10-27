// Every way an AI request can fail, with a message that's safe to show the
// user. Details (status codes, raw output) are logged on the server only.

export type AiErrorCode =
  | "not_configured" // missing API key or model name
  | "limit_reached" // the user's daily AI limit
  | "invalid_output" // still invalid after one retry
  | "refused" // the model declined, even after the fallback model
  | "busy" // rate limited or overloaded
  | "unavailable"; // any other API or network problem

const USER_MESSAGES: Record<AiErrorCode, string> = {
  not_configured: "AI features aren't set up yet. Please try again later.",
  limit_reached: "You've reached today's AI limit. It resets at midnight.",
  invalid_output: "The AI gave an answer we couldn't use. Please try again.",
  refused: "The AI couldn't help with that request. Try rephrasing it.",
  busy: "The AI is busy right now. Please try again in a minute.",
  unavailable: "The AI is unavailable right now. Please try again in a minute.",
};

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly userMessage: string;

  constructor(code: AiErrorCode, detail?: string, options?: { cause?: unknown }) {
    super(detail ?? code, options);
    this.name = "AiError";
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
  }
}
