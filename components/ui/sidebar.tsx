"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/shared/icon";

export const SIDEBAR_COLLAPSED = 64;
export const SIDEBAR_EXPANDED = 264;

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a Sidebar");
  return context;
}

/** Holds the open state. Controlled when `open` and `setOpen` are given. */
export function Sidebar({
  children,
  open: openProp,
  setOpen: setOpenProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = setOpenProp ?? setOpenState;
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * The desktop body: a slim icon column that widens on hover or focus. It is
 * fixed to the left edge and a spacer of the collapsed width keeps the page
 * clear, so widening overlays the page instead of shoving it.
 */
export function SidebarBody({
  className,
  children,
  label = "Main",
}: {
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        aria-hidden
        className="hidden shrink-0 md:block"
        style={{ width: SIDEBAR_COLLAPSED }}
      />
      <motion.nav
        aria-label={label}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-line bg-shell px-3 py-4 text-ink md:flex",
          className,
        )}
        initial={false}
        animate={{ width: open ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        {children}
      </motion.nav>
    </>
  );
}

export const SIDEBAR_ITEM =
  "group/sidebar flex h-11 w-full items-center gap-3 rounded-full px-2.5 text-meta transition-colors";

/** The label beside an icon: fades in as the sidebar widens. */
export function SidebarLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useSidebar();
  return (
    <motion.span
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      className={cn("min-w-0 flex-1 truncate whitespace-pre text-left", className)}
    >
      {children}
    </motion.span>
  );
}

export function SidebarLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: IconName;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        SIDEBAR_ITEM,
        active
          ? "bg-ink font-medium text-paper"
          : "text-ink/70 hover:bg-ink/10 hover:text-ink",
      )}
    >
      <Icon name={icon} size={20} className="shrink-0" />
      <SidebarLabel>{label}</SidebarLabel>
    </Link>
  );
}

export function SidebarButton({
  label,
  icon,
  onClick,
  trailing,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  const { open } = useSidebar();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        SIDEBAR_ITEM,
        "text-ink/70 ring-inset ring-ink/20 transition-shadow hover:bg-ink/10 hover:text-ink",
        open && "ring-1",
      )}
    >
      <Icon name={icon} size={20} className="shrink-0" />
      <SidebarLabel>{label}</SidebarLabel>
      {trailing}
    </button>
  );
}
