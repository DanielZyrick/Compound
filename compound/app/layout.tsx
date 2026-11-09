import type { Metadata } from "next";
import { Caveat, Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from our own
// domain, so there's no request to Google when a page loads.

// Text and UI.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

// Headings: a soft serif, like a printed notebook.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

// Handwriting, for sticky-note titles only.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set their own name, e.g. "Habits" becomes "Habits · Compound".
  title: { default: "Compound", template: "%s · Compound" },
  description: "Small daily steps, compounding growth: habits, daily lessons and goals in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${fraunces.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
