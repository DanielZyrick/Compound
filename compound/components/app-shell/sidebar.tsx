import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLinksView, SettingsLink, SettingsLinkView } from "./nav-links";
import { NavWithAttention } from "./nav-with-attention";
import { SidebarGoals, SidebarGoalsHeading } from "./sidebar-goals";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

/** Desktop navigation (md and up). Phones get <MobileHeader> and <MobileNav>. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar p-3 md:flex">
      <Link href="/today" aria-label="Compound, go to Today" className="px-2.5 py-2">
        <Logo />
      </Link>

      <nav aria-label="Main" className="mt-6">
        <Suspense fallback={<NavLinksView variant="sidebar" pathname={null} />}>
          <NavWithAttention variant="sidebar" />
        </Suspense>
      </nav>

      {/* The goal list scrolls on its own if the window is short. */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto border-t pt-5">
        <Suspense fallback={<SidebarGoalsHeading />}>
          <SidebarGoals />
        </Suspense>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <Suspense fallback={<SettingsLinkView pathname={null} />}>
          <SettingsLink />
        </Suspense>
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </aside>
  );
}
