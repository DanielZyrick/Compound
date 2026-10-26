// The idea behind the name: 1% better every day for a year is 1.01^365 ≈ 37.8×,
// while 1% worse every day is 0.99^365 ≈ 0.03×.

const DAYS = 365;
const WIDTH = 400;
const HEIGHT = 220;
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

export function CompoundCurve() {
  const better = (1.01 ** DAYS).toFixed(1); // "37.8"
  const worse = (0.99 ** DAYS).toFixed(2); // "0.03"

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="grid items-center gap-10 rounded-[28px] border bg-muted bg-dots p-8 md:grid-cols-2 md:p-14">
        <div>
          <p className="text-sm text-muted-foreground">Why it&apos;s called Compound</p>
          <p className="mt-2 text-7xl font-semibold tracking-tight text-primary tabular-nums">37×</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            1% better every day adds up to about 37× in a year.
          </h2>
          <p className="mt-4 text-muted-foreground">
            1.01<sup>365</sup> ≈ {better}, while 0.99<sup>365</sup> ≈ {worse}. Small steps feel
            like nothing on day one. That&apos;s the point.
          </p>
        </div>

        <figure className="rounded-2xl bg-card p-5 shadow-tile">
          <svg
            viewBox={`0 -10 ${WIDTH} ${HEIGHT + 20}`}
            role="img"
            aria-label={`Chart: improving 1% a day grows to ${better} times after a year; getting 1% worse shrinks to ${worse}.`}
            className="w-full overflow-visible"
          >
            <line x1="0" y1={HEIGHT} x2={WIDTH} y2={HEIGHT} className="stroke-border" />
            <path d={curvePath(0.99)} className="fill-none stroke-subtle" strokeWidth="2.5" strokeDasharray="6 6" />
            <path d={curvePath(1.01)} className="fill-none stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <figcaption className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Day 1</span>
            <span className="flex gap-4">
              <span className="text-primary">— 1% better</span>
              <span>-- 1% worse</span>
            </span>
            <span>Day 365</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
