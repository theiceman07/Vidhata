import type { Metadata } from "next";
import { Newsreader, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";

// Three voices, Brand Board V2.0. Newsreader carries legal substance,
// Inter operates the product, IBM Plex Mono carries notation. The serif
// is reserved for judgment; it is not a display font for atmosphere.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// QA 4.1: every route used to share one <title>/description with no
// robots.txt or sitemap.xml. metadataBase + a title template let each
// route (app/(public)/*) set its own unique metadata below; see
// app/robots.ts and app/sitemap.ts for the crawler files.
export const metadata: Metadata = {
  metadataBase: new URL("https://vidhata-pi.vercel.app"),
  title: {
    default: "Vidhata · AI drafts. Advocates decide.",
    template: "%s · Vidhata",
  },
  description:
    "AI-drafted, advocate-settled contracts for Indian startups and MSMEs. Every finding carries its source and a named advocate signs off.",
  openGraph: {
    title: "Vidhata · AI drafts. Advocates decide.",
    description:
      "AI-drafted, advocate-settled contracts for Indian startups and MSMEs. Every finding carries its source and a named advocate signs off.",
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
      className={`${newsreader.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
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
