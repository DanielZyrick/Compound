import { cn } from "@/lib/utils";

type Option<T extends string | number> = { value: T; label: string; hint?: string };

type Props<T extends string | number> = {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  /** One card per row on phones; for options with longer text. */
  stackOnMobile?: boolean;
};

/**
 * A row of selectable cards backed by native radio buttons, so arrow keys and
 * screen readers work as expected.
 */
export function OptionGroup<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 3,
  stackOnMobile = false,
}: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          "grid gap-2",
          stackOnMobile
            ? columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
            : columns === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="text-sm font-medium">{option.label}</span>
            {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
