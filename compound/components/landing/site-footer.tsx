import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

const REPO_URL = "https://github.com/DanielZyrick/Compound";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
      <div className="flex flex-col justify-between gap-10 border-t pt-14 md:flex-row">
        <div>
          <Logo />
          <p className="mt-6 max-w-md font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
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

      <div className="mt-14 flex flex-wrap justify-between gap-2 border-t py-5 text-sm text-muted-foreground">
        <span>Compound · Small daily steps, compounding growth.</span>
        <a href={REPO_URL} className="hover:text-foreground">
          Built by @DanielZyrick
        </a>
      </div>
    </footer>
  );
}
