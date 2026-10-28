"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/money/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyKind } from "@/lib/db/types";
import { CATEGORY_ICONS, type CategoryIcon as IconKey } from "@/lib/money/categories";
import type { ManagedCategory } from "@/lib/money/queries";
import { cn } from "@/lib/utils";
import { addCategory, setCategoryArchived, updateCategory, type CategoryActionResult } from "./actions";

/** One kind's categories: rename, change icon, archive, restore, add. */
export function CategoryManager({ kind, categories }: { kind: MoneyKind; categories: ManagedCategory[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  function run(action: () => Promise<CategoryActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.errors.length > 0) setError(result.errors[0]);
      else after?.();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y rounded-xl border">
        {active.map((c) => (
          <li key={c.id} className="p-2">
            {editing === c.id ? (
              <CategoryEditor
                initialName={c.name}
                initialIcon={c.icon as IconKey}
                pending={pending}
                submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSave={(name, icon) => run(() => updateCategory({ id: c.id, name, icon }), () => setEditing(null))}
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                  <CategoryIcon icon={c.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.uses} {c.uses === 1 ? "transaction" : "transactions"}
                  </span>
                </span>
                <Button variant="ghost" size="icon" aria-label={`Rename ${c.name}`} onClick={() => setEditing(c.id)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Archive ${c.name}`}
                  disabled={pending}
                  onClick={() => run(() => setCategoryArchived({ id: c.id, archived: true }))}
                >
                  <Archive />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing === `new-${kind}` ? (
        <div className="rounded-xl border p-2">
          <CategoryEditor
            initialName=""
            initialIcon="other"
            pending={pending}
            submitLabel="Add"
            onCancel={() => setEditing(null)}
            onSave={(name, icon) => run(() => addCategory({ kind, name, icon }), () => setEditing(null))}
          />
        </div>
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setEditing(`new-${kind}`)}>
          <Plus />
          Add {kind === "expense" ? "an expense" : "an income"} category
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">Archived ({archived.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1 text-sm text-muted-foreground">
                <CategoryIcon icon={c.icon} />
                <span className="flex-1">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setCategoryArchived({ id: c.id, archived: false }))}
                >
                  <ArchiveRestore />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CategoryEditor({
  initialName,
  initialIcon,
  pending,
  submitLabel,
  onSave,
  onCancel,
}: {
  initialName: string;
  initialIcon: IconKey;
  pending: boolean;
  submitLabel: string;
  onSave: (name: string, icon: IconKey) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconKey>(initialIcon);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, icon);
      }}
      className="flex flex-col gap-3 p-1"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Coffee"
        aria-label="Category name"
        maxLength={30}
        autoFocus
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-1">
        {CATEGORY_ICONS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={icon === key}
            aria-label={key}
            onClick={() => setIcon(key)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              icon === key ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            <CategoryIcon icon={key} />
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || name.trim().length === 0}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
