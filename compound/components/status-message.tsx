import { cn } from "@/lib/utils";

/** The shared layout for 404 and error messages: an eyebrow, a heading, text and actions. */
export function StatusMessage({
  eyebrow,
  title,
  children,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center text-center", className)}>
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-2 text-muted-foreground">{children}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}
