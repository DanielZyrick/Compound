import { describe, expect, it } from "vitest";
import { demoResumeAnswers, looksLikePdf, MAX_RESUME_BYTES, resumeAnswersSchema, resumeFileError } from "./resume";

const pdf = new TextEncoder().encode("%PDF-1.7\n...");
const notPdf = new TextEncoder().encode("PK\u0003\u0004 a zip file");

describe("looksLikePdf", () => {
  it("checks the file's first bytes", () => {
    expect(looksLikePdf(pdf)).toBe(true);
    expect(looksLikePdf(notPdf)).toBe(false);
    expect(looksLikePdf(new Uint8Array())).toBe(false);
  });
});

describe("resumeFileError", () => {
  it("accepts a PDF under the limit", () => {
    expect(resumeFileError({ size: 50_000, type: "application/pdf" }, pdf)).toBeNull();
  });

  it("rejects empty, large and non-PDF files", () => {
    expect(resumeFileError({ size: 0, type: "application/pdf" }, pdf)).toMatch(/empty/);
    expect(resumeFileError({ size: MAX_RESUME_BYTES + 1, type: "application/pdf" }, pdf)).toMatch(/4 MB/);
    expect(resumeFileError({ size: 50_000, type: "application/pdf" }, notPdf)).toMatch(/PDF/);
    expect(resumeFileError({ size: 50_000, type: "image/png" }, pdf)).toMatch(/PDF/);
  });
});

describe("resumeAnswersSchema", () => {
  it("accepts the demo answers, including empty ones", () => {
    expect(resumeAnswersSchema.safeParse(demoResumeAnswers()).success).toBe(true);
  });

  it("rejects answers longer than the form allows", () => {
    expect(resumeAnswersSchema.safeParse({ ...demoResumeAnswers(), role: "x".repeat(121) }).success).toBe(false);
  });
});
