import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, Flame, Target, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { FloatingTile } from "./floating";

const REPO_URL = "https://github.com/DanielZyrick/Compound";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border bg-muted bg-dots px-8 pt-12 md:px-14">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <Logo />
            <p className="mt-6 max-w-md text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Small steps today. Big results next year.
            </p>
            <Link href="/today" className={buttonVariants({ className: "mt-6 h-11 px-5 text-base" })}>
              Get started
            </Link>
          </div>

          <nav className="grid h-fit grid-cols-2 gap-x-12 gap-y-3 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href={REPO_URL} className="flex items-center gap-1 hover:text-foreground">
              GitHub <ArrowUpRight className="size-3.5" />
            </a>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </div>

        {/* A row of floating tiles, like icons scattered on a desk. */}
        <div className="mt-12 hidden h-36 items-center justify-around sm:flex">
          <FloatingTile className="-rotate-12">
            <Check className="size-7 text-primary" strokeWidth={3} />
          </FloatingTile>
          <FloatingTile className="mt-16 rotate-6">
            <Flame className="size-7 fill-orange-400 text-orange-500" />
          </FloatingTile>
          <FloatingTile className="-rotate-6">
            <BookOpen className="size-7 text-chart-2" />
          </FloatingTile>
          <FloatingTile className="mt-14 rotate-12">
            <Target className="size-7 text-destructive" />
          </FloatingTile>
          <FloatingTile className="-rotate-3">
            <Wallet className="size-7 text-success" />
          </FloatingTile>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-2 border-t py-5 text-sm text-muted-foreground">
          <span>Compound · Small daily steps, compounding growth.</span>
          <a href={REPO_URL} className="hover:text-foreground">
            Built by @DanielZyrick
          </a>
        </div>
      </div>
    </footer>
  );
}
