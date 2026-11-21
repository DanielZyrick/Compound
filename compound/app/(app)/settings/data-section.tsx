"use client";

import { useActionState, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETE_CONFIRMATION } from "@/lib/validation/settings";
import { deleteMyAccount } from "./actions";

/** Settings → Your data: download everything, or delete the account. */
export function DataSection() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          A copy of everything you&apos;ve saved in Compound, as one JSON file: habits and check-ins, tracks and lessons
          with your answers, goals, money, notes, contacts, About you and your AI usage.
        </p>
        {/* A plain link: the browser downloads the file the route sends back. */}
        <a href="/api/account/export" download className={buttonVariants({ variant: "outline", className: "self-start" })}>
          <Download />
          Download my data
        </a>
      </div>
      <DeleteAccountForm />
    </>
  );
}

function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteMyAccount, { errors: [] });
  const [confirm, setConfirm] = useState("");
  const confirmed = confirm.trim().toLowerCase() === DELETE_CONFIRMATION;

  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="font-medium text-destructive">Delete my account</h3>
      <p className="text-sm text-muted-foreground">
        This deletes your account and everything in it straight away: habits, tracks, goals, money, notes, contacts and
        About you. Google Calendar is disconnected too. It can&apos;t be undone, so download your data first if you want
        a copy.
      </p>
      <Label htmlFor="delete-confirm">Type {DELETE_CONFIRMATION} to confirm</Label>
      <div className="flex gap-2">
        <Input
          id="delete-confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="h-10"
        />
        <Button type="submit" variant="destructive" disabled={!confirmed || pending} className="h-10">
          <Trash2 />
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {state.errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {state.errors.join(" ")}
        </p>
      )}
    </form>
  );
}
