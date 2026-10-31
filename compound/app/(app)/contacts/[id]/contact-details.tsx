"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock, ExternalLink, Mail, MapPin, Pencil, Phone, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describeFollowUp } from "@/lib/contacts/follow-up";
import type { Contact } from "@/lib/contacts/queries";
import { cn } from "@/lib/utils";
import { CONTACT_LIMITS } from "@/lib/validation/contacts";
import { deleteContact, saveContact } from "../actions";

type Goal = { id: string; title: string };

/** A contact's page: their details, with Edit and Delete. */
export function ContactDetails({ contact, goals, today }: { contact: Contact; goals: Goal[]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) return <ContactForm contact={contact} goals={goals} onDone={() => setEditing(false)} />;

  const work = [contact.role, contact.company].filter(Boolean).join(" at ");
  const followUp = contact.follow_up_on ? describeFollowUp(contact.follow_up_on, today) : null;

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{contact.name}</h1>
          {work && <p className="mt-1 text-muted-foreground">{work}</p>}
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil />
          Edit
        </Button>
      </div>

      <dl className="mt-6 flex flex-col gap-3 rounded-2xl border p-5 text-sm">
        <Detail icon={CalendarClock} label="Follow up">
          {followUp ? (
            <span className={cn(followUp.due && "font-medium text-destructive")}>{followUp.label}</span>
          ) : (
            <span className="text-muted-foreground">No date set</span>
          )}
        </Detail>
        {contact.where_met && (
          <Detail icon={MapPin} label="Where you met">
            {contact.where_met}
          </Detail>
        )}
        {contact.goal_id && contact.goal_title && (
          <Detail icon={Target} label="Related goal">
            <Link href={`/goals/${contact.goal_id}`} className="text-primary hover:underline">
              {contact.goal_title}
            </Link>
          </Detail>
        )}
        {contact.email && (
          <Detail icon={Mail} label="Email">
            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
              {contact.email}
            </a>
          </Detail>
        )}
        {contact.phone && (
          <Detail icon={Phone} label="Phone">
            <a href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`} className="text-primary hover:underline">
              {contact.phone}
            </a>
          </Detail>
        )}
        {contact.linkedin && (
          <Detail icon={ExternalLink} label="LinkedIn">
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary hover:underline"
            >
              {contact.linkedin.replace(/^https:\/\/(www\.)?/, "")}
            </a>
          </Detail>
        )}
      </dl>

      {contact.notes && (
        <section className="mt-6">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-2 text-sm whitespace-pre-line break-words text-foreground/85">{contact.notes}</p>
        </section>
      )}

      <div className="mt-8 border-t pt-6">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">Delete {contact.name}? This can&apos;t be undone.</p>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteContact({ id: contact.id });
                  if (result?.errors.length) setError(result.errors[0]);
                })
              }
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 />
            Delete contact
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
    </div>
  );
}

type Field = "name" | "company" | "role" | "whereMet" | "email" | "phone" | "linkedin" | "notes" | "followUpOn" | "goalId";

function ContactForm({ contact, goals, onDone }: { contact: Contact; goals: Goal[]; onDone: () => void }) {
  const [values, setValues] = useState<Record<Field, string>>({
    name: contact.name,
    company: contact.company ?? "",
    role: contact.role ?? "",
    whereMet: contact.where_met ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    linkedin: contact.linkedin ?? "",
    notes: contact.notes ?? "",
    followUpOn: contact.follow_up_on ?? "",
    goalId: contact.goal_id ?? "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function set(field: Field) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues({ ...values, [field]: e.target.value });
  }

  function text(field: Exclude<Field, "notes" | "followUpOn" | "goalId">, label: string, extra?: object) {
    const max = CONTACT_LIMITS[field];
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`contact-${field}`}>{label}</Label>
        <Input id={`contact-${field}`} value={values[field]} onChange={set(field)} maxLength={max} className="h-10" {...extra} />
      </div>
    );
  }

  return (
    <form
      noValidate
      className="mt-6 flex flex-col gap-4 rounded-2xl border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveContact({ id: contact.id, ...values });
          setErrors(result.errors);
          if (result.errors.length === 0) onDone();
        });
      }}
    >
      <h1 className="text-xl font-semibold">Edit contact</h1>
      {text("name", "Name")}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("role", "Role", { placeholder: "e.g. Engineering manager" })}
        {text("company", "Company")}
      </div>
      {text("whereMet", "Where you met", { placeholder: "e.g. DevCon Manila 2026, or referred by Ana" })}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-followUpOn">Follow up on</Label>
          <Input id="contact-followUpOn" type="date" value={values.followUpOn} onChange={set("followUpOn")} className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-goalId">Related goal</Label>
          <select
            id="contact-goalId"
            value={values.goalId}
            onChange={set("goalId")}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">None</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("email", "Email", { type: "email", autoComplete: "off" })}
        {text("phone", "Phone", { type: "tel", autoComplete: "off" })}
      </div>
      {text("linkedin", "LinkedIn", { type: "url", placeholder: "https://www.linkedin.com/in/…" })}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-notes">Notes</Label>
        <Textarea
          id="contact-notes"
          value={values.notes}
          onChange={set("notes")}
          maxLength={CONTACT_LIMITS.notes}
          rows={4}
          placeholder="What you talked about, how they can help, what you can offer"
        />
      </div>

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || values.name.trim() === ""}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
