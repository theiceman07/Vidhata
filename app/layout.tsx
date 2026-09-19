import type { Metadata } from "next";
import { Cormorant_Infant, Outfit } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { DevRoleSwitcher } from "@/components/shared/dev-role-switcher";
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

export const metadata: Metadata = {
  title: "Vidhata — AI-drafted, lawyer-verified contracts",
  description:
    "AI-drafted, lawyer-verified contracts for Indian startups and MSMEs.",
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
          <DevRoleSwitcher />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
