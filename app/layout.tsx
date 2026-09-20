import type { Metadata } from "next";
import { Cormorant_Infant, Outfit } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";

const cormorantInfant = Cormorant_Infant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// QA 4.1: every route used to share one <title>/description with no
// robots.txt or sitemap.xml. metadataBase + a title template let each
// route (app/(public)/*) set its own unique metadata below; see
// app/robots.ts and app/sitemap.ts for the crawler files.
export const metadata: Metadata = {
  metadataBase: new URL("https://vidhata-pi.vercel.app"),
  title: {
    default: "Vidhata — AI-drafted, lawyer-verified contracts",
    template: "%s · Vidhata",
  },
  description:
    "AI-drafted, lawyer-verified contracts for Indian startups and MSMEs.",
  openGraph: {
    title: "Vidhata — AI-drafted, lawyer-verified contracts",
    description:
      "AI-drafted, lawyer-verified contracts for Indian startups and MSMEs.",
    siteName: "Vidhata",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorantInfant.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
