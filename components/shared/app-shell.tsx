"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { BrandLogo } from "@/components/shared/brand-logo";
import {
  SIDEBAR_ITEM,
  Sidebar,
  SidebarBody,
  SidebarButton,
  SidebarLabel,
  SidebarLink,
} from "@/components/ui/sidebar";
import { Icon, type IconName } from "@/components/shared/icon";
import {
  PaletteProvider,
  usePalette,
  useRegisterCommands,
  type PaletteCommand,
} from "@/components/shared/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ShellLink {
  href: string;
  label: string;
  icon: IconName;
}

export interface ShellSection {
  /** "Work", "Account". The notation voice, so it reads as a label. */
  label: string;
  links: ShellLink[];
}

/**
 * The application shell.
 *
 * One navigation structure for both portals: the work a person does
 * differs, the furniture does not.
 *
 * The rail is a slim icon column at the left edge. Pointing at it (or
 * tabbing into it) widens it over the page, with the wordmark, search,
 * section labels and who you are; it narrows again when the pointer leaves.
 *
 * There is no role control here, not even in the identity menu. Identity
 * is a person and their standing ("Ishita Rao, advocate"). The preview
 * reaches each portal through "Use the preview workspace" on that
 * portal's sign-in page; to move between them, sign out.
 */
interface AppShellProps {
  sections: ShellSection[];
  homeHref: string;
  identity: { name: string; standing: string; menuHref: string };
  /**
   * Routes that own the whole viewport: the document workspace manages
   * its own scrolling in three panes, so the shell must not pad it or
   * add a second scrollbar.
   */
  fullBleed?: boolean;
  children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  return (
    <PaletteProvider>
      <ShellBody {...props} />
    </PaletteProvider>
  );
}

function ShellBody({
  sections,
  homeHref,
  identity,
  fullBleed = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();
  const { open: openPalette } = usePalette();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const navCommands = useMemo<PaletteCommand[]>(
    () =>
      sections.flatMap((section) =>
        section.links.map((link) => ({
          id: `nav-${link.href}`,
          group: "Go to",
          label: link.label,
          icon: link.icon,
          onSelect: () => router.push(link.href),
        })),
      ),
    [sections, router],
  );
  useRegisterCommands("shell", navCommands);

  function isActive(href: string) {
    const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
    if (!matches(href)) return false;
    // The most specific link wins, so a section and one of its own pages are
    // not both lit (Settings and Privacy, on /settings/privacy).
    return !sections.some((s) =>
      s.links.some((l) => l.href.length > href.length && matches(l.href)),
    );
  }

  function handleSignOut() {
    signOut();
    toast.success("Signed out.");
    router.replace("/");
  }

  const allLinks = sections.flatMap((section) => section.links);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col bg-paper md:flex-row">
        {/* Desktop · the rail, tucked to a sliver until it is wanted. */}
        <Rail
          sections={sections}
          homeHref={homeHref}
          isActive={isActive}
          isMac={isMac}
          onSearch={openPalette}
          renderIdentity={(onOpenChange, railOpen) => (
            <IdentityMenu
              identity={identity}
              onInk
              collapsed={!railOpen}
              onOpenChange={onOpenChange}
              onSignOut={handleSignOut}
            />
          )}
        />

        {/* Mobile · the same pill, lying flat */}
        {/* Opaque behind the pill, so a page scrolling beneath it passes under
            the bar and is not seen at its sides. */}
        <header className="sticky top-0 z-30 bg-paper px-3 pb-2 pt-3 md:hidden">
          <div className="flex h-14 items-center justify-between rounded-full border border-line bg-shell pl-6 pr-2 text-ink">
            <Link href={homeHref} className="text-ink">
              <BrandLogo size="md" />
            </Link>
            <IdentityMenu
              identity={identity}
              inHeader
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        {/* The page and the preview banner share one column, so the banner
            takes its own row and the page scrolls beneath it. */}
        <div className="flex min-w-0 flex-1 flex-col md:h-screen">
          {/* PreviewBanner hidden for now. */}
          <main
            className={cn(
              "min-h-0 min-w-0 flex-1",
              fullBleed
                ? "relative md:overflow-y-auto lg:overflow-hidden"
                : "px-4 pb-24 pt-3 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-8 md:pt-3",
            )}
          >
            {children}
          </main>
        </div>

        {/* The workspace owns the bottom of a small screen for its finding
            sheet, so the tab bar stands down there. */}
        {!fullBleed && (
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper md:hidden"
          >
            {allLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 border-t-2 py-2 text-small transition-colors",
                    active
                      ? "border-ink font-medium text-ink"
                      : "border-transparent text-muted-fg",
                  )}
                >
                  <Icon name={link.icon} size={20} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * The desktop rail: a slim icon column that widens on hover or focus, over
 * the page (components/ui/sidebar.tsx). Wordmark and section labels show
 * only while it is open.
 */
function Rail({
  sections,
  homeHref,
  isActive,
  onSearch,
  renderIdentity,
}: {
  sections: ShellSection[];
  homeHref: string;
  isActive: (href: string) => boolean;
  isMac: boolean;
  onSearch: () => void;
  /** The identity menu, told when it opens so the rail stays open under it. */
  renderIdentity: (onOpenChange: (open: boolean) => void, open: boolean) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const open = hovered || menuOpen;

  return (
    <Sidebar open={open} setOpen={setHovered}>
      <SidebarBody>
        <div className="flex h-9 items-center overflow-hidden pl-2.5">
          <Link href={homeHref} aria-label="Vidhata home" className="rounded-full text-ink">
            {open ? (
              <BrandLogo size="md" />
            ) : (
              <span className="inline-block font-wordmark text-h2 font-normal leading-none tracking-[-0.02em]">
                Vi
              </span>
            )}
          </Link>
        </div>

        <div className="mt-6">
          <SidebarButton label="Search" icon="search" onClick={onSearch} />
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto overflow-x-hidden">
          {sections.map((section) => (
            <div key={section.label}>
              <p
                aria-hidden={!open}
                className={cn(
                  "h-6 truncate whitespace-pre px-2.5 pb-1.5 text-label text-ink/60 transition-opacity duration-150",
                  open ? "opacity-100" : "opacity-0",
                )}
              >
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <SidebarLink
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      active={isActive(link.href)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-auto">{renderIdentity(setMenuOpen, open)}</div>
      </SidebarBody>
    </Sidebar>
  );
}

const ITEM_ON_INK = "text-ink focus:bg-ink/10";

function iconTone(onInk: boolean): string {
  return onInk ? "text-ink/55" : "text-muted-fg";
}

/** Initials for the identity disc. The one place a circle is allowed. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function IdentityMenu({
  identity,
  inHeader = false,
  onInk = false,
  collapsed = false,
  onOpenChange,
  onSignOut,
}: {
  identity: { name: string; standing: string; menuHref: string };
  /** The small-screen header: the disc alone, dropping down from the top-right. */
  inHeader?: boolean;
  /** The open rail: the disc with the name and standing, set on ink. */
  onInk?: boolean;
  /** The rail is narrow: the disc alone. */
  collapsed?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-full text-left transition-colors hover:bg-ink/10",
          inHeader ? "p-1" : "w-full px-1 py-2",
        )}
        aria-label={`${identity.name}, ${identity.standing}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-parchment font-mono text-notation text-ink">
          {initials(identity.name)}
        </span>
        {onInk && !collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span title={identity.name} className="block truncate text-meta font-medium text-ink">
                {identity.name}
              </span>
              <span className="block truncate text-label text-ink/55">
                {identity.standing}
              </span>
            </span>
            <Icon name="expand_more" size={18} className="text-ink/55" />
          </>
        )}
      </DropdownMenuTrigger>

      {/* On the rail the menu is part of the capsule: the trigger's own
          width, set on ink, rising from it. The trigger already names
          who you are, so the menu goes straight to what you can do. */}
      <DropdownMenuContent
        side={inHeader ? "bottom" : "top"}
        align={inHeader ? "end" : "start"}
        sideOffset={8}
        className={cn(
          "rounded-card",
          onInk
            ? "rounded-control w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 border-line bg-shell text-ink"
            : "w-64 shadow-float",
        )}
      >
        {!onInk && (
          <>
            <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-parchment font-mono text-label text-ink">
                {initials(identity.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-meta font-medium text-ink">
                  {identity.name}
                </span>
                <span className="block text-meta text-muted-fg">
                  Signed in as {identity.standing.toLowerCase()}
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild className={cn(onInk && ITEM_ON_INK)}>
          <Link href={identity.menuHref}>
            <Icon name="person" size={18} className={iconTone(onInk)} />
            Your details
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className={cn(onInk && "bg-ink/15")} />
        <DropdownMenuItem className={cn(onInk && ITEM_ON_INK)} onSelect={onSignOut}>
          <Icon name="logout" size={18} className={iconTone(onInk)} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
