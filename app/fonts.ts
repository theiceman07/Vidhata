import { Brygada_1918, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";

// Three voices (Board V3). Brygada 1918, a book serif with a legal
// press's gravity, sets headlines and contract text. Hanken Grotesk does
// everything else. Apfel Grotezk is the wordmark and nothing but the
// wordmark (self-hosted, SIL OFL 1.1, from Collletttivo).
//
// They are declared once, here, because two files render an <html> element:
// the root layout and global-error.tsx, which replaces it when the layout
// itself fails.
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

/** The class names that put the three font variables on <html>. */
export const FONT_VARIABLES = `${serif.variable} ${sans.variable} ${wordmark.variable}`;
