import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLinks, NavLinksView } from "./nav-links";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

/** Desktop navigation (md and up). Phones get <MobileHeader> and <MobileNav>. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar p-3 md:flex">
      <Link href="/today" aria-label="Compound, go to Today" className="px-2.5 py-2">
        <Logo />
      </Link>

      <nav aria-label="Main" className="mt-6 flex-1">
        <Suspense fallback={<NavLinksView variant="sidebar" pathname={null} />}>
          <NavLinks variant="sidebar" />
        </Suspense>
      </nav>

      <Suspense fallback={<UserMenuSkeleton />}>
        <UserMenu />
      </Suspense>
    </aside>
  );
}
