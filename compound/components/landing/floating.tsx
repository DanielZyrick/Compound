import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Decorative "3D" pieces that float around the hero and footer. They're built
// from plain CSS (gradient, ring, layered shadow), so no images are needed.

/** A square, glossy app-icon style tile. */
export function FloatingTile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-16 place-items-center rounded-2xl bg-linear-to-b from-white to-[#f1f1f4] shadow-tile ring-1 ring-black/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A small white card showing a piece of the app. */
export function FloatingCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "w-60 rounded-2xl bg-white/95 p-4 text-left shadow-tile ring-1 ring-black/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A checklist row: a round check that turns green and strikes the text when done. */
export function CheckItem({ done = false, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full",
          done ? "bg-success text-white" : "border border-input",
        )}
      >
        {done && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className={cn(done && "text-muted-foreground line-through")}>{children}</span>
    </li>
  );
}

/** A thin progress bar. `value` is 0–100. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn("h-full rounded-full bg-primary", className)} style={{ width: `${value}%` }} />
    </div>
  );
}
