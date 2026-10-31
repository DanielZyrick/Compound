"use server";

import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import {
  demoResumeAnswers,
  RESUME_PROMPT,
  RESUME_SYSTEM_PROMPT,
  resumeAnswersSchema,
  resumeFileError,
  type ResumeAnswers,
} from "@/lib/profile/resume";

export type ReadResumeResult = { answers: ResumeAnswers | null; source: "ai" | "demo" | null; error: string | null };

/**
 * Drafts About you answers from a PDF resume. Nothing is saved here: the file
 * is read once and dropped, and the user reviews the answers before saving.
 */
export async function readResume(formData: FormData): Promise<ReadResumeResult> {
  const user = await requireOnboardedUser();

  const file = formData.get("resume");
  if (!(file instanceof File)) return { answers: null, source: null, error: "Choose a PDF first." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = resumeFileError(file, bytes);
  if (problem) return { answers: null, source: null, error: problem };

  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "resume",
      tier: "smart",
      schema: resumeAnswersSchema,
      system: RESUME_SYSTEM_PROMPT,
      prompt: RESUME_PROMPT,
      pdf: Buffer.from(bytes).toString("base64"),
      effort: "low",
      demo: demoResumeAnswers,
    });
    return { answers: data, source, error: null };
  } catch (error) {
    if (error instanceof AiError) return { answers: null, source: null, error: error.userMessage };
    throw error;
  }
}
