"use client";

/**
 * "Skip to content": the first tab stop on every page, shown only when it
 * has focus. It moves focus to the page's <main>, past the header or the
 * rail, and that also puts keyboard scrolling inside the portal's scroll
 * area. Pages do not need an id on their <main> for it to work.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(event) => {
        const main = document.querySelector("main");
        if (!main) return;
        event.preventDefault();
        main.setAttribute("tabindex", "-1");
        // The region is the whole page: a ring round it says nothing.
        main.style.outline = "none";
        main.focus({ preventScroll: true });
        main.scrollIntoView({ block: "start" });
      }}
      className="sr-only rounded-full bg-ink px-5 py-2.5 text-meta font-medium text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
    >
      Skip to content
    </a>
  );
}
