import {
  ChartColumn,
  GraduationCap,
  House,
  ListChecks,
  StickyNote,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** false until the page exists: shown greyed out with a "Soon" badge. */
  ready: boolean;
  /** false to keep it off the phone tab bar (sidebar only), which fits six. */
  tabBar?: boolean;
}

// One list for both the desktop sidebar and the phone tab bar.
export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: House, ready: true },
  { href: "/habits", label: "Habits", icon: ListChecks, ready: true },
  { href: "/tracks", label: "Learn", icon: GraduationCap, ready: true },
  { href: "/goals", label: "Goals", icon: Target, ready: true },
  { href: "/money", label: "Money", icon: Wallet, ready: true },
  { href: "/notes", label: "Notes", icon: StickyNote, ready: true, tabBar: false },
  { href: "/progress", label: "Progress", icon: ChartColumn, ready: true },
];

/** True on the item's own page and on any page below it (/tracks/123). */
export function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
