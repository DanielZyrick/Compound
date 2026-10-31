import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { getContact, getGoalOptions } from "@/lib/contacts/queries";
import { todayIn } from "@/lib/dates/calendar";
import { ContactDetails } from "./contact-details";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/contacts" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Contacts
      </Link>
      <Suspense fallback={<div aria-hidden className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <ContactContent params={params} />
      </Suspense>
    </main>
  );
}

async function ContactContent({ params }: Pick<PageProps<"/contacts/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireOnboardedUser();
  const [contact, goals] = await Promise.all([getContact(user.id, id), getGoalOptions(user.id)]);
  if (!contact) notFound();

  return <ContactDetails contact={contact} goals={goals} today={todayIn(user.timezone)} />;
}
