"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/shared/icon";

/**
 * The command palette.
 *
 * One way to get anywhere without the mouse: every screen can add the
 * commands that make sense on it (the workspace adds its clauses and
 * findings), and the shell adds navigation. Opened with Ctrl/Cmd+K from
 * anywhere in the product.
 *
 * Filtering is a plain substring match rather than fuzzy scoring,
 * because one of the things it searches is contract text, and a fuzzy
 * match on a phrase from a clause finds passages that do not contain it.
 */
export interface PaletteCommand {
  id: string;
  group: string;
  label: string;
  /** Right-aligned notation: a clause number, a state, a shortcut. */
  hint?: string;
  icon?: IconName;
  /** Extra text to search, e.g. the clause body. Matched, never shown whole. */
  searchText?: string;
  onSelect: () => void;
}

interface PaletteContextValue {
  register: (source: string, commands: PaletteCommand[]) => void;
  unregister: (source: string) => void;
  open: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider");
  return ctx;
}

/** Registers commands for as long as the calling component is mounted. */
export function useRegisterCommands(source: string, commands: PaletteCommand[]) {
  const { register, unregister } = usePalette();
  useEffect(() => {
    register(source, commands);
  }, [source, commands, register]);
  useEffect(() => () => unregister(source), [source, unregister]);
}

/** A short excerpt around the first match, so a hit in a clause is legible. */
function excerpt(text: string, query: string): string | null {
  const at = text.toLowerCase().indexOf(query);
  if (at === -1) return null;
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + query.length + 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Record<string, PaletteCommand[]>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const register = useCallback((source: string, commands: PaletteCommand[]) => {
    setSources((prev) => ({ ...prev, [source]: commands }));
  }, []);

  const unregister = useCallback((source: string) => {
    setSources((prev) => {
      const next = { ...prev };
      delete next[source];
      return next;
    });
  }, []);

  const open = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const value = useMemo(
    () => ({ register, unregister, open }),
    [register, unregister, open],
  );

  const q = query.trim().toLowerCase();
  const all = Object.values(sources).flat();
  const matches = all
    .map((command) => {
      if (!q) return { command, snippet: null };
      if (command.label.toLowerCase().includes(q)) return { command, snippet: null };
      if (command.hint?.toLowerCase().includes(q)) return { command, snippet: null };
      const snippet = command.searchText ? excerpt(command.searchText, q) : null;
      return snippet ? { command, snippet } : null;
    })
    .filter((m): m is { command: PaletteCommand; snippet: string | null } => m !== null);

  const groups = matches.reduce<Record<string, typeof matches>>((acc, m) => {
    (acc[m.command.group] ??= []).push(m);
    return acc;
  }, {});

  return (
    <PaletteContext.Provider value={value}>
      {children}

      <Command.Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
        label="Command palette"
        shouldFilter={false}
        loop
        overlayClassName="fixed inset-0 z-50 bg-ink/20"
        contentClassName={cn(
          "fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2",
          "overflow-hidden rounded-modal border border-line bg-paper shadow-float",
        )}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Icon name="search" size={20} className="text-muted-fg" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search clauses, findings and commands"
            className="field-bare h-12 w-full bg-transparent text-body text-ink outline-none placeholder:text-muted-fg"
          />
          <kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-label text-muted-fg">
            Esc
          </kbd>
        </div>

        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-meta text-muted-fg">
            Nothing matches “{query}”.
          </Command.Empty>

          {Object.entries(groups).map(([group, items]) => (
            <Command.Group
              key={group}
              heading={group}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-label [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-fg"
            >
              {items.map(({ command, snippet }) => (
                <Command.Item
                  key={command.id}
                  value={command.id}
                  onSelect={() => {
                    setIsOpen(false);
                    command.onSelect();
                  }}
                  className="flex cursor-pointer items-start gap-3 rounded-control px-3 py-2 text-meta text-ink data-[selected=true]:bg-parchment"
                >
                  {command.icon && (
                    <Icon name={command.icon} size={18} className="mt-px text-muted-fg" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{command.label}</span>
                    {snippet && (
                      <span className="mt-0.5 block truncate font-clause text-meta text-muted-fg">
                        {snippet}
                      </span>
                    )}
                  </span>
                  {command.hint && (
                    <span className="shrink-0 font-mono text-label text-muted-fg">
                      {command.hint}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </PaletteContext.Provider>
  );
}
