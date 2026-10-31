"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAILY_MINUTES, type DailyMinutes } from "@/lib/db/types";
import type { ContextProfile } from "@/lib/profile/context";
import { cn } from "@/lib/utils";
import { PROFILE_LIMITS } from "@/lib/validation/profile";
import { saveProfile } from "./actions";

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

  function change() {
    setSaved(false);
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
