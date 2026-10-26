import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLinks, NavLinksView } from "./nav-links";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

/** Phone top bar: logo and the account menu. Hidden from md up. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
      <Link href="/today" aria-label="Compound, go to Today">
        <Logo />
      </Link>
      <Suspense fallback={<UserMenuSkeleton compact />}>
        <UserMenu compact />
      </Suspense>
    </header>
  );
}

/** Phone tab bar, fixed to the bottom. Hidden from md up. */
export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <Suspense fallback={<NavLinksView variant="tabs" pathname={null} />}>
        <NavLinks variant="tabs" />
      </Suspense>
    </nav>
  );
}
