import type { Metadata } from "next";
import { AppPreview } from "@/components/landing/app-preview";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { WhyCompound } from "@/components/landing/why-compound";

export const metadata: Metadata = { title: { absolute: "Compound · Small daily steps, compounding growth" } };

// Fully static: no session read, so it's prerendered and loads instantly.
// Signed-out visitors who click "Get started" are sent to /login by proxy.ts.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col gap-24 pt-2 pb-24 md:gap-32">
        <Hero />
        <AppPreview />
        <Features />
        <HowItWorks />
        <WhyCompound />
      </main>
      <SiteFooter />
    </>
  );
}
