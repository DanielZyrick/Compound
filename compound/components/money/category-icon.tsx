import {
  Banknote,
  Briefcase,
  Bus,
  CircleEllipsis,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Receipt,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIcon as IconKey } from "@/lib/money/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<IconKey, LucideIcon> = {
  food: Utensils,
  transport: Bus,
  bills: Receipt,
  shopping: ShoppingBag,
  health: HeartPulse,
  fun: Gamepad2,
  education: GraduationCap,
  giving: HandHeart,
  salary: Banknote,
  work: Briefcase,
  gift: Gift,
  other: CircleEllipsis,
};

/** The icon for a category's stored key; unknown keys fall back to "other". */
export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon as IconKey] ?? CircleEllipsis;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
