import Link from "next/link";
import { BookOpen, Check, Flame } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { CheckItem, FloatingCard, FloatingTile, ProgressBar } from "./floating";

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[28px] border bg-muted bg-dots px-6 py-20 text-center md:py-28">
        <HeroDecorations />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center">
          <FloatingTile className="size-20 rounded-3xl">
            <LogoMark className="size-10" />
          </FloatingTile>

          <h1 className="mt-10 text-5xl font-semibold tracking-tight text-balance md:text-7xl">
            Small daily steps,
            <span className="block text-subtle">compounding growth.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Build habits, learn something every day, and finish the goals you start, one small
            step at a time.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/today" className={buttonVariants({ className: "h-11 px-5 text-base" })}>
              Get started, it&apos;s free
            </Link>
            <a
              href="#how-it-works"
              className={buttonVariants({ variant: "outline", className: "h-11 px-5 text-base" })}
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The floating notes, tiles and cards around the headline. Hidden on small screens. */
function HeroDecorations() {
  return (
    <div className="hidden lg:block">
      {/* Top left: sticky note with a check tile */}
      <div
        aria-hidden
        className="absolute top-14 left-10 w-48 -rotate-6 rounded-sm bg-[#fff3a3] p-4 text-left text-sm leading-snug text-[#5c4d00] italic shadow-tile"
      >
        Read 10 pages before bed. Small steps add up!
      </div>
      <FloatingTile className="absolute top-44 left-40 rotate-6">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Check className="size-5" strokeWidth={3} />
        </span>
      </FloatingTile>

      {/* Top right: streak */}
      <FloatingTile className="absolute top-16 right-56 -rotate-6">
        <Flame className="size-8 fill-orange-400 text-orange-500" />
      </FloatingTile>
      <FloatingCard className="absolute top-32 right-8 w-52 rotate-3">
        <p className="text-xs text-muted-foreground">Current streak</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">12 days</p>
        <p className="text-sm text-muted-foreground">Read the Bible</p>
      </FloatingCard>

      {/* Bottom left: today's habits */}
      <FloatingCard className="absolute bottom-10 left-8 -rotate-2">
        <p className="text-sm font-semibold">Today&apos;s habits</p>
        <ul className="mt-3 space-y-2 text-sm">
          <CheckItem done>Walk 20 minutes</CheckItem>
          <CheckItem done>Pray</CheckItem>
          <CheckItem>Review your numbers</CheckItem>
        </ul>
      </FloatingCard>

      {/* Bottom right: a lesson */}
      <FloatingCard className="absolute right-10 bottom-12 rotate-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-primary" />
          Python basics · Day 4
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Exercise 2 of 3</p>
        <div className="mt-2">
          <ProgressBar value={66} />
        </div>
      </FloatingCard>
    </div>
  );
}
