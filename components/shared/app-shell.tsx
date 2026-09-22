"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { BrandMark, BrandLogo } from "@/components/shared/brand-logo";
import { Icon, type IconName } from "@/components/shared/icon";
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

const STORAGE_KEY = "vidhata-sidebar";
const PREVIEW_MODE = process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1";

/**
 * The application shell.
 *
 * One navigation structure for both portals: the work a person does
 * differs, the furniture does not. The rail collapses to its icons and
 * remembers that choice, because a reviewer working a document wants the
 * screen, and someone moving between screens wants the labels.
 *
 * There is no role control here. Identity is a person and their standing
 * ("Ananya Rao, advocate"), and the preview build's role switch lives
 * inside that menu rather than floating over the product.
 */
export function AppShell({
  sections,
  homeHref,
  identity,
  /**
   * Routes that own the whole viewport: the document workspace manages
   * its own scrolling in three panes, so the shell must not pad it or
   * add a second scrollbar.
   */
  fullBleed = false,
  children,
}: {
  sections: ShellSection[];
  homeHref: string;
  identity: { name: string; standing: string; menuHref: string };
  fullBleed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, signOut } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "collapsed");
    } catch {
      // storage unavailable · the rail simply starts expanded
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          next ? "collapsed" : "expanded",
        );
      } catch {
        // storage unavailable · the choice lasts this session only
      }
      return next;
    });
  }, []);

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
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Desktop · the rail */}
        <nav
          aria-label="Main"
          data-collapsed={collapsed}
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-paper md:flex",
            // Suppress the width transition until the stored state has
            // been read, so the rail does not visibly slide on load.
            hydrated && "transition-[width] duration-200 ease-out",
            collapsed ? "w-[68px]" : "w-[248px]",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b border-line",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            )}
          >
            <Link href={homeHref} className="text-ink" aria-label="Vidhata home">
              {collapsed ? <BrandMark size={24} /> : <BrandLogo size="sm" />}
            </Link>
            {!collapsed && (
              <RailButton
                onClick={toggle}
                icon="left_panel_close"
                label="Collapse the sidebar"
              />
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-5">
            {sections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <p className="px-4 pb-2 font-mono text-notation uppercase tracking-notation text-muted-fg">
                    {section.label}
                  </p>
                )}
                <ul className={cn(collapsed && "space-y-1")}>
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <RailLink
                        link={link}
                        active={isActive(link.href)}
                        collapsed={collapsed}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {collapsed && (
            <div className="flex justify-center border-t border-line py-2">
              <RailButton
                onClick={toggle}
                icon="left_panel_open"
                label="Expand the sidebar"
              />
            </div>
          )}

          <div
            className={cn(
              "border-t border-line",
              collapsed ? "flex justify-center p-2" : "p-3",
            )}
          >
            <IdentityMenu
              identity={identity}
              collapsed={collapsed}
              role={role}
              onSwitchRole={setRole}
              onSignOut={handleSignOut}
            />
          </div>
        </nav>

        {/* Mobile · brand bar above, tabs below */}
        <header className="flex h-14 items-center justify-between border-b border-line bg-paper px-4 md:hidden">
          <Link href={homeHref} className="text-ink">
            <BrandLogo size="sm" />
          </Link>
          <IdentityMenu
            identity={identity}
            collapsed
            role={role}
            onSwitchRole={setRole}
            onSignOut={handleSignOut}
          />
        </header>

        <main
          className={cn(
            "min-w-0 flex-1",
            fullBleed
              ? "md:h-screen md:overflow-y-auto lg:overflow-hidden"
              : "px-4 py-8 pb-24 md:h-screen md:overflow-y-auto md:px-10 md:py-10 md:pb-10",
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

function RailLink({
  link,
  active,
  collapsed,
}: {
  link: ShellLink;
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 border-l-2 py-2 text-body transition-colors",
        collapsed ? "mx-2 justify-center rounded-control px-0 py-2.5" : "px-4",
        // Accent marks a decision, not a location. Where you are is said
        // with weight and a rule, which leaves the green meaning
        // something when it finally appears.
        active
          ? "border-ink bg-parchment font-medium text-ink"
          : "border-transparent text-muted-fg hover:bg-canvas hover:text-ink",
        collapsed && "border-l-0",
      )}
    >
      <Icon name={link.icon} size={20} />
      {!collapsed && <span className="truncate">{link.label}</span>}
      {collapsed && <span className="sr-only">{link.label}</span>}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{link.label}</TooltipContent>
    </Tooltip>
  );
}

function RailButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: IconName;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="rounded-control p-1.5 text-muted-fg transition-colors hover:bg-canvas hover:text-ink"
        >
          <Icon name={icon} size={20} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
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
  collapsed,
  role,
  onSwitchRole,
  onSignOut,
}: {
  identity: { name: string; standing: string; menuHref: string };
  collapsed: boolean;
  role: "client" | "lawyer" | null;
  onSwitchRole: (role: "client" | "lawyer") => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-control text-left transition-colors hover:bg-canvas",
          collapsed ? "justify-center p-1" : "p-2",
        )}
        aria-label={`${identity.name}, ${identity.standing}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-parchment font-mono text-notation text-ink">
          {initials(identity.name)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-meta font-medium text-ink">
                {identity.name}
              </span>
              <span className="block truncate font-mono text-notation uppercase tracking-notation text-muted-fg">
                {identity.standing}
              </span>
            </span>
            <Icon name="expand_more" size={18} className="text-muted-fg" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start">
        <DropdownMenuLabel>{identity.standing}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={identity.menuHref}>
            <Icon name="person" size={18} className="text-muted-fg" />
            Your details
          </Link>
        </DropdownMenuItem>

        {/* Preview builds only. Role switching is a development affordance
            and has no place in the product's visual layer. */}
        {PREVIEW_MODE && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                onSwitchRole(role === "lawyer" ? "client" : "lawyer")
              }
            >
              <Icon name="swap_horiz" size={18} className="text-muted-fg" />
              {role === "lawyer"
                ? "Preview the client portal"
                : "Preview the advocate portal"}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <Icon name="logout" size={18} className="text-muted-fg" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
