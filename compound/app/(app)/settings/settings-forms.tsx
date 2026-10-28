"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { TimezoneSelect } from "@/components/timezone-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@/lib/money/amount";
import { updateCurrency, updateDisplayName, updateTimezone, type SettingsResult } from "./actions";

/** Shared save state: errors, a short "Saved" confirmation, and pending. */
function useSave(action: (input: unknown) => Promise<SettingsResult>) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(input: unknown) {
    setErrors([]);
    setSaved(false);
    startTransition(async () => {
      const result = await action(input);
      setErrors(result.errors);
      setSaved(result.errors.length === 0);
    });
  }

  return { errors, saved, pending, save, clearSaved: () => setSaved(false) };
}

export function DisplayNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const { errors, saved, pending, save, clearSaved } = useSave(updateDisplayName);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ name });
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="display-name">Display name</Label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearSaved();
          }}
          maxLength={60}
          className="h-10"
        />
        <Button type="submit" variant="outline" disabled={pending || name.trim() === initial} className="h-10">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <Feedback errors={errors} saved={saved} />
    </form>
  );
}

export function TimezoneForm({ initial }: { initial: string }) {
  const [timezone, setTimezone] = useState(initial);
  const { errors, saved, pending, save, clearSaved } = useSave(updateTimezone);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ timezone });
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="timezone">Timezone</Label>
      <div className="flex gap-2">
        <TimezoneSelect
          value={timezone}
          onChange={(zone) => {
            setTimezone(zone);
            clearSaved();
          }}
        />
        <Button type="submit" variant="outline" disabled={pending || timezone === initial} className="h-10">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Decides when your day starts and ends. Check-ins you&apos;ve already saved keep their dates.
      </p>
      <Feedback errors={errors} saved={saved} />
    </form>
  );
}

function Feedback({ errors, saved }: { errors: string[]; saved: boolean }) {
  if (errors.length > 0) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {errors.join(" ")}
      </p>
    );
  }
  return saved ? (
    <p role="status" className="flex items-center gap-1 text-sm text-success">
      <Check className="size-4" />
      Saved
    </p>
  ) : null;
}

const CURRENCY_NAMES: Record<string, string> = {
  PHP: "Philippine peso (₱)",
  USD: "US dollar ($)",
  EUR: "Euro (€)",
  GBP: "British pound (£)",
  SGD: "Singapore dollar (S$)",
  AUD: "Australian dollar (A$)",
  CAD: "Canadian dollar (C$)",
};

export function CurrencyForm({ initial }: { initial: string }) {
  const [currency, setCurrency] = useState(initial);
  const { errors, saved, pending, save, clearSaved } = useSave(updateCurrency);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ currency });
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="currency">Currency</Label>
      <div className="flex gap-2">
        <select
          id="currency"
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value);
            clearSaved();
          }}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_NAMES[code] ?? code}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending || currency === initial} className="h-10">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The currency you record in. Amounts you&apos;ve already saved aren&apos;t converted.
      </p>
      <Feedback errors={errors} saved={saved} />
    </form>
  );
}
