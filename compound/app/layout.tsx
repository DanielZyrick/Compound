import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

// next/font downloads the font at build time and serves it from our own
// domain, so there's no request to Google when a page loads.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set their own name, e.g. "Habits" becomes "Habits · Compound".
  title: { default: "Compound", template: "%s · Compound" },
  description: "Small daily steps, compounding growth: habits, daily lessons and goals in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
