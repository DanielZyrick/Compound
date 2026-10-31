"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTACT_LIMITS } from "@/lib/validation/contacts";
import { addContact } from "./actions";

/** A name and a company, then Enter. The rest can be added on the contact's page. */
export function QuickAddContact() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameInput = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addContact({ name, company });
          if (result.errors.length > 0) {
            setError(result.errors[0]);
          } else {
            setName("");
            setCompany("");
            nameInput.current?.focus();
          }
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          ref={nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="New contact's name"
          maxLength={CONTACT_LIMITS.name}
        />
        <div className="flex gap-2">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company (optional)"
            aria-label="Company"
            maxLength={CONTACT_LIMITS.company}
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            aria-label="Add contact"
            disabled={pending || name.trim() === ""}
          >
            <Plus />
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
