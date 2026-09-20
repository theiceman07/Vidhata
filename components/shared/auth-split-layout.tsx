import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";

interface AuthSplitLayoutProps {
  panelTitle: string;
  panelDescription: string;
  children: ReactNode;
}

export function AuthSplitLayout({
  panelTitle,
  panelDescription,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col justify-center bg-ink px-8 py-12 text-canvas md:px-16">
        <Link href="/" className="mb-8 text-canvas">
          <BrandLogo />
        </Link>
        <h1 className="font-display text-h1">{panelTitle}</h1>
        <p className="mt-3 max-w-sm text-body text-canvas/80">
          {panelDescription}
        </p>
      </div>
      <div className="flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
