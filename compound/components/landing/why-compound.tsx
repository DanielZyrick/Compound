/** Why the app is called Compound: the 1%-a-day math, in one line. */
export function WhyCompound() {
  const better = (1.01 ** 365).toFixed(1); // "37.8"
  const worse = (0.99 ** 365).toFixed(2); // "0.03"

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="grid items-center gap-6 rounded-3xl border bg-card p-8 md:grid-cols-[auto_1fr] md:gap-12 md:p-14">
        <p className="font-heading text-7xl font-semibold tracking-tight text-primary tabular-nums md:text-8xl">37×</p>
        <div>
          <p className="text-sm text-muted-foreground">Why it&apos;s called Compound</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            1% better every day adds up to about 37× in a year.
          </h2>
          <p className="mt-3 text-muted-foreground">
            1.01<sup>365</sup> ≈ {better}, while 0.99<sup>365</sup> ≈ {worse}. Small steps feel like nothing on
            day one. That&apos;s the point.
          </p>
        </div>
      </div>
    </section>
  );
}
