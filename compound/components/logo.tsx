import { cn } from "@/lib/utils";

/** Compound's mark: three dots growing up and to the right, like compound growth. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <circle cx="4.5" cy="19" r="2.5" className="fill-foreground" />
      <circle cx="10.5" cy="13.5" r="3.5" className="fill-foreground" />
      <circle cx="18" cy="6.5" r="5" className="fill-primary" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-semibold", className)}>
      <LogoMark />
      Compound
    </span>
  );
}
