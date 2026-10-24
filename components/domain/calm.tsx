"use client";

import { createContext, useContext, useState } from "react";

/**
 * The calmer presentation of a document page: a continuous column and open
 * sections in place of sand cards. It is a presentation switch only. The
 * panels read it and draw themselves differently; what they show, and every
 * state they hold, is unchanged. Outside a provider they are the cards they
 * always were.
 */
const CalmContext = createContext(false);

export function CalmProvider({ children }: { children: React.ReactNode }) {
  return <CalmContext.Provider value>{children}</CalmContext.Provider>;
}

export function useCalm(): boolean {
  return useContext(CalmContext);
}

/**
 * A collapsible section drawn without the native details element. Safari
 * clips a details body that opens inside a scrolling pane and leaves the
 * pane's height stale; conditionally rendering the body does not. The
 * header is one button carrying aria-expanded and aria-controls.
 */
export function CalmDisclosure({
  id,
  header,
  children,
  className,
  buttonClassName,
}: {
  id: string;
  header: (open: boolean) => React.ReactNode;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {header(open)}
      </button>
      {open && <div id={id}>{children}</div>}
    </div>
  );
}
