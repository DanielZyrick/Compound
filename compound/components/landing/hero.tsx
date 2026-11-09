import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GrowthChart } from "./growth-chart";

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="grid items-center gap-12 pt-8 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="font-hand text-2xl text-primary">a notebook for getting 1% better</p>
          <h1 className="mt-3 text-5xl leading-[1.05] font-semibold tracking-tight text-balance md:text-7xl">
            Small daily steps, <em className="font-medium text-primary">compounding</em> growth.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Build habits, learn something every day, and finish the goals you start, one small step at a
            time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/today" className={buttonVariants({ className: "h-11 px-5 text-base" })}>
              Get started, it&apos;s free
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: "outline", className: "h-11 px-5 text-base" })}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Sign in with Google or GitHub. No credit card.</p>
        </div>

        <GrowthChart />
      </div>
    </section>
  );
}
