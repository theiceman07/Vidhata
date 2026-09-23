"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Icon, type IconName } from "@/components/shared/icon";
import {
  PaletteProvider,
  usePalette,
  useRegisterCommands,
  type PaletteCommand,
} from "@/components/shared/command-palette";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const PIN_KEY = "vidhata-rail-pinned";
/** How long the rail waits after the pointer leaves before tucking away. */
const TUCK_DELAY_MS = 280;

/**
 * The application shell.
 *
 * One navigation structure for both portals: the work a person does
 * differs, the furniture does not.
 *
 * The rail tucks away, as Arc's sidebar does. At rest it is a sliver of
 * the ink capsule standing at the left edge, enough to say something is
 * there. Pointing at it (or tabbing into it) opens it in full, with the
 * wordmark, search, the sections and who you are, and the page makes room
 * rather than being covered. It tucks away again when the pointer leaves.
 * It can be kept open, and remembers that, because someone moving between
 * screens wants it and a reviewer working a document wants the width.
 *
 * There is no role control here, not even in the identity menu. Identity
 * is a person and their standing ("Ananya Rao, advocate"). The preview
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
    return pathname === href || pathname.startsWith(`${href}/`);
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
          renderIdentity={(onOpenChange) => (
            <IdentityMenu
              identity={identity}
              onInk
              onOpenChange={onOpenChange}
              onSignOut={handleSignOut}
            />
          )}
        />

        {/* Mobile · the same pill, lying flat */}
        <header className="sticky top-0 z-30 px-3 pt-3 md:hidden">
          <div className="flex h-14 items-center justify-between rounded-full bg-ink pl-6 pr-2 text-paper">
            <Link href={homeHref} className="text-paper">
              <BrandLogo size="md" />
            </Link>
            <IdentityMenu
              identity={identity}
              inHeader
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main
          className={cn(
            "min-w-0 flex-1",
            fullBleed
              ? "md:h-screen md:overflow-y-auto lg:overflow-hidden"
              : "px-4 py-6 pb-24 md:h-screen md:overflow-y-auto md:px-8 md:py-8",
          )}
        >
          {children}
        </main>

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
 * The desktop rail. At rest, a sliver of ink (RAIL_REST wide with its
 * gutter); open, the full capsule (RAIL_OPEN). A spacer in the page's
 * flow takes the same width, so opening the rail moves the page over
 * rather than covering it.
 */
const RAIL_GUTTER = 8;
const RAIL_SLIVER = 8;
const RAIL_CAPSULE = 248;
const RAIL_REST = RAIL_GUTTER * 2 + RAIL_SLIVER;
const RAIL_OPEN = RAIL_GUTTER * 2 + RAIL_CAPSULE;
const RAIL_EASE = "duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)]";

function Rail({
  sections,
  homeHref,
  isActive,
  isMac,
  onSearch,
  renderIdentity,
}: {
  sections: ShellSection[];
  homeHref: string;
  isActive: (href: string) => boolean;
  isMac: boolean;
  onSearch: () => void;
  /** The identity menu, told when it opens so the rail stays open under it. */
  renderIdentity: (onOpenChange: (open: boolean) => void) => React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tuck = useRef<number | null>(null);

  useEffect(() => {
    try {
      setPinned(window.localStorage.getItem(PIN_KEY) === "1");
    } catch {
      // Storage unavailable: the rail starts tucked away.
    }
  }, []);

  const togglePin = useCallback(() => {
    setPinned((was) => {
      try {
        window.localStorage.setItem(PIN_KEY, was ? "0" : "1");
      } catch {
        // Storage unavailable: the choice lasts for this page only.
      }
      return !was;
    });
  }, []);

  // Ctrl+\ (Cmd+\ on a Mac) keeps it open or lets it tuck away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePin]);

  useEffect(
    () => () => {
      if (tuck.current) window.clearTimeout(tuck.current);
    },
    [],
  );

  function enter() {
    if (tuck.current) window.clearTimeout(tuck.current);
    setHovered(true);
  }

  function leave() {
    if (tuck.current) window.clearTimeout(tuck.current);
    tuck.current = window.setTimeout(() => setHovered(false), TUCK_DELAY_MS);
  }

  const open = pinned || hovered || focused || menuOpen;
  const pinKeys = isMac ? "⌘\\" : "Ctrl \\";

  return (
    <>
      {/* Holds the rail's width in the page's flow. */}
      <div
        aria-hidden
        className={cn("hidden shrink-0 transition-[width] md:block", RAIL_EASE)}
        style={{ width: open ? RAIL_OPEN : RAIL_REST }}
      />

      <div
        className="fixed inset-y-0 left-0 z-40 hidden md:block"
        style={{ padding: RAIL_GUTTER }}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <nav
          aria-label="Main"
          className={cn(
            "relative h-full overflow-hidden rounded-modal bg-ink text-paper transition-[width]",
            RAIL_EASE,
          )}
          style={{ width: open ? RAIL_CAPSULE : RAIL_SLIVER }}
        >
          {/* The grip on the sliver: the one mark that says it opens. */}
          <span
            aria-hidden
            className={cn(
              "absolute left-1/2 top-1/2 h-8 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/45 transition-opacity duration-150",
              open ? "opacity-0" : "opacity-100",
            )}
          />

          {/* A fixed width inside, so nothing rewraps while the capsule
              opens. Still reachable by Tab while tucked: focus opens it. */}
          <div
            className={cn(
              "flex h-full flex-col px-3 py-5 transition-opacity",
              open ? "opacity-100 delay-75 duration-200" : "pointer-events-none opacity-0 duration-100",
            )}
            style={{ width: RAIL_CAPSULE }}
          >
            <div className="flex items-center justify-between pl-3">
              <Link href={homeHref} aria-label="Vidhata home" className="rounded-full text-paper">
                <BrandLogo size="md" />
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={togglePin}
                    aria-pressed={pinned}
                    aria-label={pinned ? "Let the sidebar tuck away" : "Keep the sidebar open"}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
                  >
                    <Icon name={pinned ? "left_panel_close" : "left_panel_open"} size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {pinned ? "Tuck away" : "Keep open"} · {pinKeys}
                </TooltipContent>
              </Tooltip>
            </div>

            <button
              type="button"
              onClick={onSearch}
              className="mt-6 flex h-11 items-center gap-3 rounded-full px-3 text-meta text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <Icon name="search" size={20} />
              Search
              <kbd className="ml-auto font-mono text-label text-paper/45">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>

            <div className="mt-4 space-y-5">
              {sections.map((section) => (
                <div key={section.label}>
                  <p className="px-3 pb-1.5 text-label text-paper/45">{section.label}</p>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => {
                      const active = isActive(link.href);
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-11 items-center gap-3 rounded-full px-3 text-meta transition-colors",
                              active
                                ? "bg-paper font-medium text-ink"
                                : "text-paper/70 hover:bg-paper/10 hover:text-paper",
                            )}
                          >
                            <Icon name={link.icon} size={20} />
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-auto">{renderIdentity(setMenuOpen)}</div>
          </div>
        </nav>
      </div>
    </>
  );
}

const ITEM_ON_INK = "rounded-full text-paper focus:bg-paper/10";

function iconTone(onInk: boolean): string {
  return onInk ? "text-paper/55" : "text-muted-fg";
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
  onOpenChange,
  onSignOut,
}: {
  identity: { name: string; standing: string; menuHref: string };
  /** The small-screen header: the disc alone, dropping down from the top-right. */
  inHeader?: boolean;
  /** The open rail: the disc with the name and standing, set on ink. */
  onInk?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-full text-left transition-colors hover:bg-paper/10",
          inHeader ? "p-1" : "w-full p-2",
        )}
        aria-label={`${identity.name}, ${identity.standing}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-parchment font-mono text-notation text-ink">
          {initials(identity.name)}
        </span>
        {onInk && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-meta font-medium text-paper">
                {identity.name}
              </span>
              <span className="block truncate text-label text-paper/55">
                {identity.standing}
              </span>
            </span>
            <Icon name="expand_more" size={18} className="text-paper/55" />
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
          "rounded-card p-1.5",
          onInk
            ? "w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 border-paper/15 bg-ink text-paper"
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
                <span className="block text-label text-muted-fg">
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

        <DropdownMenuSeparator className={cn(onInk && "bg-paper/15")} />
        <DropdownMenuItem className={cn(onInk && ITEM_ON_INK)} onSelect={onSignOut}>
          <Icon name="logout" size={18} className={iconTone(onInk)} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
