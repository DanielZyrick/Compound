import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { getAllCategories } from "@/lib/money/queries";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/money" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Money
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-muted-foreground">
        Archived categories stay on old transactions but aren&apos;t offered when adding new ones.
      </p>
      <Suspense fallback={<div aria-hidden className="mt-8 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Categories />
      </Suspense>
    </main>
  );
}

async function Categories() {
  const user = await requireOnboardedUser();
  const categories = await getAllCategories(user.id);
  return (
    <div className="mt-8 flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Expenses</h2>
        <CategoryManager kind="expense" categories={categories.filter((c) => c.kind === "expense")} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Income</h2>
        <CategoryManager kind="income" categories={categories.filter((c) => c.kind === "income")} />
      </section>
    </div>
  );
}
