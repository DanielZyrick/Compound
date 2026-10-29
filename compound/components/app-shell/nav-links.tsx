"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS, type NavItem } from "./nav-items";

type Variant = "sidebar" | "tabs";

/**
 * Reads the URL to highlight the current page. With cacheComponents,
 * usePathname suspends on routes with unknown dynamic params, so render this
 * inside <Suspense> with <NavLinksView pathname={null} /> as the fallback.
 */
export function NavLinks({ variant, attention = [] }: { variant: Variant; attention?: string[] }) {
  const pathname = usePathname();
  return <NavLinksView variant={variant} pathname={pathname} attention={attention} />;
}

export function NavLinksView({
  variant,
  pathname,
  attention = [],
}: {
  variant: Variant;
  pathname: string | null;
  /** Links that need the user's attention, e.g. "/goals" when a goal is behind. */
  attention?: string[];
}) {
  return (
    <ul className={variant === "sidebar" ? "space-y-1" : "grid grid-cols-6"}>
      {NAV_ITEMS.filter((item) => variant === "sidebar" || item.tabBar !== false).map((item) => (
        <li key={item.href}>
          {variant === "sidebar" ? (
            <SidebarLink item={item} active={isActive(pathname, item.href)} alert={attention.includes(item.href)} />
          ) : (
            <TabLink item={item} active={isActive(pathname, item.href)} alert={attention.includes(item.href)} />
          )}
        </li>
      ))}
    </ul>
  );
}

const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings, ready: true };

/** Settings, pinned at the bottom of the sidebar. Render inside <Suspense> (usePathname). */
export function SettingsLink() {
  return <SettingsLinkView pathname={usePathname()} />;
}

export function SettingsLinkView({ pathname }: { pathname: string | null }) {
  return <SidebarLink item={SETTINGS} active={isActive(pathname, SETTINGS.href)} alert={false} />;
}

function SidebarLink({ item, active, alert }: { item: NavItem; active: boolean; alert: boolean }) {
  const { href, label, icon: Icon, ready } = item;
  const base = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm";

  if (!ready) {
    return (
      <span aria-disabled className={cn(base, "text-subtle")}>
        <Icon className="size-4" />
        {label}
        <Badge variant="outline" className="ml-auto text-subtle">
          Soon
        </Badge>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
      {alert && <AttentionDot className="ml-auto" />}
    </Link>
  );
}

function TabLink({ item, active, alert }: { item: NavItem; active: boolean; alert: boolean }) {
  const { href, label, icon: Icon, ready } = item;
  const base = "flex flex-col items-center gap-1 py-2 text-[11px]";

  if (!ready) {
    return (
      <span aria-disabled title={`${label}: coming soon`} className={cn(base, "text-subtle opacity-50")}>
        <Icon className="size-5" />
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(base, active ? "font-medium text-primary" : "text-muted-foreground")}
    >
      <span className="relative">
        <Icon className="size-5" />
        {alert && <AttentionDot className="absolute -top-0.5 -right-1" />}
      </span>
      {label}
    </Link>
  );
}

/** A small amber dot with a text label for screen readers, so it isn't colour alone. */
function AttentionDot({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden title="Needs attention" className={cn("size-2 rounded-full bg-chart-3 ring-2 ring-background", className)} />
      <span className="sr-only"> (needs attention)</span>
    </>
  );
}
