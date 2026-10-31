"use client";

import { useRef, useState, useTransition } from "react";
import { Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAILY_MINUTES, type DailyMinutes } from "@/lib/db/types";
import type { ContextProfile } from "@/lib/profile/context";
import { cn } from "@/lib/utils";
import { MAX_RESUME_BYTES } from "@/lib/profile/resume";
import { PROFILE_LIMITS } from "@/lib/validation/profile";
import { saveProfile } from "./actions";
import { readResume } from "./resume-actions";

type TextField = "role" | "improve" | "skills" | "interests";

const QUESTIONS: { field: TextField; label: string; hint: string; placeholder: string }[] = [
  {
    field: "role",
    label: "What do you do?",
    hint: "Your work or studies.",
    placeholder: "e.g. Junior web developer at a small agency",
  },
  {
    field: "improve",
    label: "What do you want to get better at?",
    hint: "Skills, habits or parts of life.",
    placeholder: "e.g. Backend development, public speaking, saving money",
  },
  {
    field: "skills",
    label: "What do you already know?",
    hint: "So lessons can skip the basics.",
    placeholder: "e.g. HTML, CSS, some JavaScript",
  },
  {
    field: "interests",
    label: "What are you interested in?",
    hint: "Used for examples that feel familiar.",
    placeholder: "e.g. Running, personal finance, the Bible",
  },
];

export function ProfileForm({ initial }: { initial: ContextProfile | null }) {
  const [answers, setAnswers] = useState<Record<TextField, string>>({
    role: initial?.role ?? "",
    improve: initial?.improve ?? "",
    skills: initial?.skills ?? "",
    interests: initial?.interests ?? "",
  });
  const [minutes, setMinutes] = useState<DailyMinutes | null>(initial?.daily_minutes ?? null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [resume, setResume] = useState<{ notice: string | null; error: string | null }>({ notice: null, error: null });
  const [reading, startReading] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function change() {
    setSaved(false);
  }

  function readFile(file: File) {
    setResume({ notice: null, error: null });
    const data = new FormData();
    data.set("resume", file);
    startReading(async () => {
      const result = await readResume(data);
      if (fileInput.current) fileInput.current.value = ""; // the same file can be picked again
      if (!result.answers) {
        setResume({ notice: null, error: result.error });
        return;
      }
      const drafted = result.answers;
      // Fill in what the resume says; keep your own text where it says nothing.
      setAnswers((current) => ({
        role: drafted.role || current.role,
        improve: drafted.improve || current.improve,
        skills: drafted.skills || current.skills,
        interests: drafted.interests || current.interests,
      }));
      change();
      setResume({
        notice:
          result.source === "demo"
            ? "Filled in with example answers (no AI key is set). Check them, then Save."
            : "Filled in from your resume. Check the answers, then Save.",
        error: null,
      });
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors([]);
        startTransition(async () => {
          const result = await saveProfile({ ...answers, dailyMinutes: minutes });
          setErrors(result.errors);
          setSaved(result.errors.length === 0);
        });
      }}
    >
      <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-medium">Have a resume?</span>{" "}
            <span className="text-muted-foreground">Claude can fill this in for you to check.</span>
          </p>
          <Button type="button" variant="outline" size="sm" disabled={reading} onClick={() => fileInput.current?.click()}>
            <FileText />
            {reading ? "Reading your resume…" : "Fill in from your resume (PDF)"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            aria-label="Resume (PDF)"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          PDF under {MAX_RESUME_BYTES / 1024 / 1024} MB. The file isn&apos;t stored, and nothing is saved until you press
          Save. Contact details are left out.
        </p>
        {resume.notice && (
          <p role="status" className="text-sm text-success">
            {resume.notice}
          </p>
        )}
        {resume.error && (
          <p role="alert" className="text-sm text-destructive">
            {resume.error}
          </p>
        )}
      </div>
      {QUESTIONS.map(({ field, label, hint, placeholder }) => (
        <div key={field} className="flex flex-col gap-1.5">
          <Label htmlFor={`profile-${field}`}>{label}</Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {field === "role" ? (
            <Input
              id={`profile-${field}`}
              value={answers[field]}
              placeholder={placeholder}
              maxLength={PROFILE_LIMITS[field]}
              onChange={(e) => {
                setAnswers({ ...answers, [field]: e.target.value });
                change();
              }}
              className="h-10"
            />
          ) : (
            <Textarea
              id={`profile-${field}`}
              value={answers[field]}
              placeholder={placeholder}
              maxLength={PROFILE_LIMITS[field]}
              rows={2}
              onChange={(e) => {
                setAnswers({ ...answers, [field]: e.target.value });
                change();
              }}
            />
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <p id="profile-minutes" className="text-sm font-medium">
          How much time do you have for learning each day?
        </p>
        <div role="radiogroup" aria-labelledby="profile-minutes" className="flex flex-wrap gap-2">
          {DAILY_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              onClick={() => {
                setMinutes(minutes === m ? null : m);
                change();
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                minutes === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && (
          <p role="status" className="flex items-center gap-1 text-sm text-success">
            <Check className="size-4" />
            Saved. Your next principle, track and goal plan will use it.
          </p>
        )}
      </div>
    </form>
  );
}
