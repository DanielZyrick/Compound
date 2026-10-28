import type { MoneyKind } from "@/lib/db/types";

// The categories every user starts with. They're copied into the user's own
// categories the first time they use Money, so they can rename or archive
// them like any other.

/** Icon keys stored in money_categories.icon; the UI maps them to icons. */
export const CATEGORY_ICONS = [
  "food",
  "transport",
  "bills",
  "shopping",
  "health",
  "fun",
  "education",
  "giving",
  "salary",
  "work",
  "gift",
  "other",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORIES: Record<MoneyKind, { name: string; icon: CategoryIcon }[]> = {
  expense: [
    { name: "Food", icon: "food" },
    { name: "Transport", icon: "transport" },
    { name: "Bills", icon: "bills" },
    { name: "Shopping", icon: "shopping" },
    { name: "Health", icon: "health" },
    { name: "Fun", icon: "fun" },
    { name: "Education", icon: "education" },
    { name: "Giving", icon: "giving" },
    { name: "Other", icon: "other" },
  ],
  income: [
    { name: "Salary", icon: "salary" },
    { name: "Side job", icon: "work" },
    { name: "Gift", icon: "gift" },
    { name: "Other", icon: "other" },
  ],
};
