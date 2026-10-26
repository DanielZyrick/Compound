import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" aria-label="Compound home">
        <Logo />
      </Link>

      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        <a href="#features" className="hover:text-foreground">
          Features
        </a>
        <a href="#how-it-works" className="hover:text-foreground">
          How it works
        </a>
      </nav>

      <div className="flex items-center gap-2">
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Sign in
        </Link>
        <Link href="/today" className={buttonVariants({ size: "lg", className: "px-4" })}>
          Get started
        </Link>
      </div>
    </header>
  );
}
