"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTrackArchived } from "./archive-actions";

/** "Archive track", with a confirmation, at the bottom of a track's page. */
export function ArchiveTrack({ trackId, title }: { trackId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm">
            Archive <span className="font-medium">{title}</span>? It leaves Learn and Today; your progress is kept.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setTrackArchived({ id: trackId, archived: true });
                if (result.errors.length > 0) setError(result.errors[0]);
                setConfirming(false);
              })
            }
          >
            Archive
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => setConfirming(true)}>
          <Archive />
          Archive track
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Restore" for an archived track, on its page or in Learn's Archived list. */
export function RestoreTrack({ trackId, title }: { trackId: string; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        aria-label={`Restore ${title}`}
        onClick={() =>
          startTransition(async () => {
            const result = await setTrackArchived({ id: trackId, archived: false });
            setError(result.errors[0] ?? null);
          })
        }
      >
        <ArchiveRestore />
        Restore
      </Button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
