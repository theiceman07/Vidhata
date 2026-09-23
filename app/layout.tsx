import type { Metadata, Viewport } from "next";
import { Brygada_1918, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";
import { MATERIAL_SYMBOLS_HREF } from "@/components/shared/icon";

// Three voices (Board V3). Brygada 1918, a book serif with a legal
// press's gravity, sets headlines and contract text. Hanken Grotesk does
// everything else. Apfel Grotezk is the wordmark and nothing but the
// wordmark (self-hosted, SIL OFL 1.1, from Collletttivo).
const serif = Brygada_1918({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const wordmark = localFont({
  variable: "--font-wordmark",
  src: [
    { path: "./fonts/apfel-grotezk-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/apfel-grotezk-latin-700-normal.woff2", weight: "700" },
  ],
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

// The browser chrome takes the accent: the one colour the product uses,
// shown where the product meets the operating system.
export const viewport: Viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${wordmark.variable} h-full antialiased`}
    >
      <head>
        {/* Material Symbols Outlined, subset to the names the product
            uses. See components/shared/icon.tsx. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_HREF} />
      </head>
      {/* The column is what keeps a short page's footer at the bottom.
          Children stretch to it by default, but a child that centres
          itself with `mx-auto` would otherwise shrink to its own content
          width — which is how every section on the landing page ended up
          narrower than the canvas it was given. `items-stretch` is the
          default; `[&>*]:w-full` is what holds it against auto margins.
          The rule sits on an inner column, not on body: menus, popovers
          and tooltips mount straight into body, and a full-width
          positioning wrapper throws them to the left edge. */}
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <div className="flex flex-1 flex-col [&>*]:w-full">{children}</div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
