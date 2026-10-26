type Props = {
  label: string;
  title: React.ReactNode;
  description?: string;
};

/** Centered section heading with a small pill label above it. */
export function SectionHeading({ label, title, description }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <span className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-card">
        {label}
      </span>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
    </div>
  );
}
