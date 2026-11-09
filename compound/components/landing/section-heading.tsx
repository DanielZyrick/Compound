type Props = {
  /** "01", "02"…: sections are numbered like pages in a notebook. */
  number: string;
  label: string;
  title: React.ReactNode;
  description?: string;
};

/** A left-aligned section heading with a numbered label above it. */
export function SectionHeading({ number, label, title, description }: Props) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 text-sm font-medium text-primary">
        <span className="tabular-nums">{number}</span>
        <span aria-hidden className="h-px w-8 bg-primary/40" />
        {label}
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
    </div>
  );
}
