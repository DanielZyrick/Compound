import { Suspense } from "react";
import { MobileHeader, MobileNav } from "@/components/app-shell/mobile-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { DemoBanner } from "@/components/demo-banner";

// The signed-in app's shell. The (app) folder is a route group: it shares this
// layout without adding to the URL, so /today stays /today.
//
// No auth check here: layouts don't re-render on navigation, so each page
// calls requireOnboardedUser() itself.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        {/* Bottom padding keeps content clear of the phone tab bar. */}
        <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
