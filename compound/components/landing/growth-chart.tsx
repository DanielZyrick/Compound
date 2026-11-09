// The idea behind the name: 1% better every day for a year is 1.01^365 ≈ 37.8×,
// while 1% worse every day is 0.99^365 ≈ 0.03×.

const DAYS = 365;
const WIDTH = 400;
const HEIGHT = 260;
const MAX_VALUE = 40; // top of the chart, just above 1.01^365

/** An SVG path for value = rate^day over one year, scaled into the chart. */
function curvePath(rate: number) {
  const points: string[] = [];
  for (let day = 0; day <= DAYS; day += 5) {
    const x = (day / DAYS) * WIDTH;
    const y = HEIGHT - (rate ** day / MAX_VALUE) * HEIGHT;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

/**
 * The hero picture: a page of graph paper where the 1%-a-day curve draws
 * itself, with handwritten notes in the margin. The drawing is CSS only and
 * stays still for visitors who ask for less motion.
 */
export function GrowthChart() {
  const better = (1.01 ** DAYS).toFixed(1); // "37.8"
  const worse = (0.99 ** DAYS).toFixed(2); // "0.03"
  const endY = HEIGHT - ((1.01 ** DAYS) / MAX_VALUE) * HEIGHT;

  return (
    <figure className="relative rounded-3xl border bg-card bg-grid p-6 pt-16 shadow-tile sm:p-8 sm:pt-20">
      <p aria-hidden className="absolute top-5 right-6 animate-note font-hand text-2xl text-primary sm:top-7 sm:right-8 sm:text-3xl">
        day 365: {better}× ↘
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT + 4}`}
        role="img"
        aria-label={`Chart: improving 1% a day grows to ${better} times after a year; getting 1% worse shrinks to ${worse}.`}
        className="w-full overflow-visible"
      >
        <line x1="0" y1={HEIGHT} x2={WIDTH} y2={HEIGHT} className="stroke-foreground/30" strokeWidth="1.5" />
        <path
          d={curvePath(0.99)}
          pathLength={1}
          className="animate-draw fill-none stroke-subtle"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={curvePath(1.01)}
          pathLength={1}
          className="animate-draw fill-none stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={WIDTH} cy={endY} r="7" className="animate-note fill-primary" />
      </svg>
      <div aria-hidden className="mt-3 flex items-end justify-between font-hand text-xl leading-tight text-muted-foreground sm:text-2xl">
        <span className="animate-note">
          day 1:
          <br />
          you barely notice
        </span>
        <span className="animate-note text-right text-subtle">1% worse: {worse}×</span>
      </div>
      <figcaption className="sr-only">
        1.01 to the power of 365 is about {better}; 0.99 to the power of 365 is about {worse}.
      </figcaption>
    </figure>
  );
}
