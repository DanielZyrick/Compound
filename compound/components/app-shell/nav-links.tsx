"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS, type NavItem } from "./nav-items";

type Variant = "sidebar" | "tabs";

/**
 * Reads the URL to highlight the current page. With cacheComponents,
 * usePathname suspends on routes with unknown dynamic params, so render this
 * inside <Suspense> with <NavLinksView pathname={null} /> as the fallback.
 */
export function NavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavLinksView variant={variant} pathname={pathname} />;
}

export function NavLinksView({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  return (
    <ul className={variant === "sidebar" ? "space-y-1" : "grid grid-cols-6"}>
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          {variant === "sidebar" ? (
            <SidebarLink item={item} active={isActive(pathname, item.href)} />
          ) : (
            <TabLink item={item} active={isActive(pathname, item.href)} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
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
    </Link>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
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
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
