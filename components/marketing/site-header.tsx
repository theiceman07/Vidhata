"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The public header: one solid black bar across the full width of the page.
 * It is black in light and dark mode alike (literal values, not the theme
 * tokens, which flip with the mode).
 *
 * Two menus and a link in the middle, sign-in at the end. Below lg the
 * middle folds into one Menu.
 */
const MENUS = [
  {
    label: "Get started",
    links: [
      { href: "/sample", label: "Sample document", note: "A settled document, start to finish" },
      { href: "/contracts", label: "Agreements", note: "What Vidhata drafts" },
      { href: "/contact", label: "Contact us", note: "A person replies" },
    ],
  },
  {
    label: "Product",
    links: [
      { href: "/#how", label: "How it works", note: "Four steps, brief to signature" },
      { href: "/#arc", label: "Findings in the margin", note: "One clause through review" },
      { href: "/#india", label: "India checks", note: "Screened against Indian statute" },
      { href: "/#advocates", label: "Advocate sign-off", note: "A named advocate on the record" },
    ],
  },
] as const;

const TRIGGER =
  "inline-flex h-11 items-center gap-1 rounded-full px-4 text-body font-medium text-[#FFFFFF]/75 transition-colors hover:text-[#FFFFFF] focus-visible:ring-offset-[#000000] data-[state=open]:text-[#FFFFFF] [&[data-state=open]>span:last-child]:rotate-180";

/* The menus are the bar continued: the same black, a white hairline, white
   labels. Literal values for the reason the bar uses them. */
const PANEL = "rounded-card border-[#FFFFFF]/15 bg-[#000000] p-2 text-[#FFFFFF] data-[state=open]:slide-in-from-top-1";
const ITEM =
  "group min-h-11 cursor-pointer justify-between gap-4 px-3 py-2.5 text-[#FFFFFF] focus:bg-[#FFFFFF]/10 focus-visible:ring-offset-[#000000]";

function MenuLinks({ links }: { links: (typeof MENUS)[number]["links"] }) {
  return (
    <>
      {links.map((link) => (
        <DropdownMenuItem key={link.href} asChild className={ITEM}>
          <Link href={link.href}>
            <span className="flex flex-col">
              <span className="text-body font-medium">{link.label}</span>
              <span className="text-meta text-[#FFFFFF]/65">{link.note}</span>
            </span>
            {/* Shown on the row in hand: where the link goes is a move, not a label. */}
            <Icon
              name="arrow_forward"
              className="-translate-x-1 opacity-0 transition-[opacity,transform] duration-150 ease-out group-data-[highlighted]:translate-x-0 group-data-[highlighted]:opacity-100"
            />
          </Link>
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#FFFFFF]/15 bg-[#000000] text-[#FFFFFF]">
      <div className="site-wrap grid h-16 grid-cols-[1fr_auto] items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label="Vidhata home" className="justify-self-start focus-visible:ring-offset-[#000000]">
          <BrandLogo size="md" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {MENUS.map((menu) => (
            <DropdownMenu key={menu.label} modal={false}>
              <DropdownMenuTrigger className={TRIGGER}>
                {menu.label}
                <Icon name="expand_more" size={20} className="transition-transform duration-200 ease-out" />
              </DropdownMenuTrigger>
              {/* Offset so the labels start under the trigger's own label. */}
              <DropdownMenuContent align="start" alignOffset={-4} sideOffset={18} className={cn(PANEL, "w-[22rem]")}>
                <MenuLinks links={menu.links} />
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          <Link href="/pricing" className={TRIGGER}>
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-full bg-[#FFFFFF] px-6 text-body font-medium text-[#000000] transition-colors hover:bg-[#FFFFFF]/85 focus-visible:ring-offset-[#000000]"
          >
            Sign in
          </Link>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label="Menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#FFFFFF]/25 text-[#FFFFFF] focus-visible:ring-offset-[#000000] lg:hidden"
            >
              <Icon name="menu" size={24} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={18} className={cn(PANEL, "max-h-[calc(100svh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto")}>
              {MENUS.map((menu) => (
                <div key={menu.label}>
                  <DropdownMenuLabel className="px-3 text-[#FFFFFF]/65">{menu.label}</DropdownMenuLabel>
                  <MenuLinks links={menu.links} />
                </div>
              ))}
              <DropdownMenuItem asChild className={cn(ITEM, "text-body font-medium")}>
                <Link href="/pricing">Pricing</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
