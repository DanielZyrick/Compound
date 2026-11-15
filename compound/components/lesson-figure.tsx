import { ArrowDown, ArrowRight } from "lucide-react";
import type { FigureContent } from "@/lib/lessons/schema";
import { cn } from "@/lib/utils";
import { InlineText } from "./inline-text";

/**
 * A lesson diagram, drawn like a sketch on graph paper. The AI only chooses
 * the kind and writes the labels; the drawing is always ours, so it matches
 * the app and nothing the AI wrote is ever inserted as HTML or SVG.
 *
 * Every kind is a grid of text (see figureSchema for what the rows mean).
 */
export function LessonFigure({ figure, className }: { figure: FigureContent; className?: string }) {
  return (
    <figure className={cn("min-w-0 overflow-hidden rounded-xl border border-foreground/15 bg-card shadow-card", className)}>
      <div className="bg-grid p-4 sm:p-5">
        {figure.kind === "steps" ? (
          <StepsFigure rows={figure.rows} />
        ) : figure.kind === "compare" ? (
          <CompareFigure headers={figure.headers} rows={figure.rows} />
        ) : (
          <TableFigure headers={figure.headers} rows={figure.rows} />
        )}
      </div>
      <figcaption className="border-t border-foreground/15 bg-muted px-4 py-2 text-center text-sm text-muted-foreground">
        <InlineText text={figure.caption} />
      </figcaption>
    </figure>
  );
}

/** A flow: numbered cards joined by arrows. Side by side on wide screens when they fit. */
function StepsFigure({ rows }: { rows: string[][] }) {
  const row = rows.length <= 4;
  return (
    <ol className={cn("flex flex-col items-stretch gap-2", row && "sm:flex-row")}>
      {rows.map(([label, note], i) => (
        <li key={i} className={cn("flex flex-col items-stretch gap-2", row && "sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center")}>
          {i > 0 && (
            <span aria-hidden className="flex shrink-0 justify-center text-muted-foreground">
              <ArrowDown className={cn("size-4", row && "sm:hidden")} />
              {row && <ArrowRight className="hidden size-4 sm:block" />}
            </span>
          )}
          <div className={cn("rounded-lg border border-foreground/15 bg-background px-3 py-2.5", row && "sm:min-w-0 sm:flex-1 sm:self-stretch")}>
            <p className="font-hand text-xl leading-none text-primary">{i + 1}</p>
            <p className="mt-1 text-sm font-medium break-words">
              <InlineText text={label} />
            </p>
            {note && (
              <p className="mt-0.5 text-xs break-words text-muted-foreground">
                <InlineText text={note} />
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Two things side by side: each row of the grid gives one point to each side. */
function CompareFigure({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
      <CompareSide title={headers[0]} points={rows.map((row) => row[0])} />
      <p aria-hidden className="self-center text-center font-hand text-2xl leading-none text-muted-foreground">
        vs
      </p>
      <CompareSide title={headers[1]} points={rows.map((row) => row[1])} />
    </div>
  );
}

function CompareSide({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="min-w-0 rounded-lg border border-foreground/15 bg-background px-3 py-2.5">
      <p className="text-sm font-semibold break-words">
        <InlineText text={title} />
      </p>
      <ul className="mt-1.5 flex flex-col gap-1 text-sm">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 break-words">
              <InlineText text={point} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small table, such as the rows a query returns. Wide tables scroll inside the figure. */
function TableFigure({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-foreground/15 bg-background">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/15 bg-muted">
            {headers.map((header, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                <InlineText text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-foreground/10 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
