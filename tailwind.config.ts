import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";
import plugin from "tailwindcss/plugin";
import { PALETTE, hexToChannels } from "./lib/palette";

/** A palette token as a CSS-variable colour, so opacity modifiers still work. */
const v = (token: string) => `rgb(var(--c-${token}) / <alpha-value>)`;

const channels = (mode: "light" | "dark") =>
  Object.fromEntries(
    Object.entries(PALETTE).map(([k, m]) => [`--c-${k}`, hexToChannels(m[mode])]),
  );

// Advocate AI colour board, light and dark: black, white, one blue; status is
// a solid fill with a white label. The hex values live in lib/palette.ts, the
// single source of truth; the contrast test reads them from there.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: v("bg-canvas"), // the page
        surface: v("tile-default"),
        sand: v("bg-subtle"), // quiet panels
        line: { DEFAULT: v("border-default"), strong: v("border-strong") },
        ink: v("text-primary"),
        muted: v("text-secondary"),
        subtle: v("text-muted"),
        tile: { hover: v("tile-hover"), selected: v("tile-selected"), inverse: v("tile-inverse") },
        brand: { DEFAULT: v("accent-text"), deep: v("accent-hover"), tint: v("tile-selected") },
        // Status is a solid fill with a white label, never a text colour or a
        // panel tint: the text keys point at text/primary and the tint keys at
        // tile/default.
        done: { DEFAULT: v("status-accepted"), text: v("text-primary"), tint: v("tile-default") },
        progress: { DEFAULT: v("status-verified"), text: v("accent-text"), tint: v("tile-default") },
        move: { DEFAULT: v("status-pending"), text: v("text-primary"), tint: v("tile-default") },
        blocked: { DEFAULT: v("status-rejected"), text: v("text-primary"), tint: v("tile-default") },
        highlight: { DEFAULT: v("highlight-bg"), text: v("highlight-text") },
        night: v("tile-inverse"), // dark bands: tile/inverse with bg/canvas as the text
        shell: v("bg-subtle"), // the portal rail and its mobile bar, edged with border/default
        // The calmer document page (app/(client)/documents/[id]). Scoped to it
        // through CalmProvider; nothing else reads these. It shares the one
        // palette, mapped onto its own names.
        calm: {
          canvas: v("bg-subtle"),
          surface: v("bg-canvas"),
          muted: v("tile-default"),
          ink: v("text-primary"),
          strong: v("text-primary"),
          secondary: v("text-secondary"),
          border: v("border-default"),
          "border-strong": v("border-default"),
          divider: v("border-default"),
          accent: v("accent-fill"),
          "accent-muted": v("tile-default"),
          success: v("status-accepted"),
          "success-muted": v("tile-default"),
          warning: v("text-primary"),
          "warning-muted": v("tile-default"),
          focus: v("accent-fill"),
        },
        mint: v("bg-canvas"), // ticks on night

        // Aliases for the pre-board names, kept because about 100 files and
        // the home page still use them. Each points at its new meaning and
        // goes when its last user is migrated.
        accent: { DEFAULT: v("accent-fill"), hover: v("accent-hover"), fg: v("accent-on") },
        "muted-fg": v("text-secondary"),
        canvas: v("bg-canvas"),
        parchment: v("bg-subtle"),
        verified: v("status-accepted"),
        flagged: v("status-rejected"),
        caution: { DEFAULT: v("status-pending"), fg: v("status-pending") },
        info: v("status-verified"),
      },
      fontFamily: {
        // Board V3. A serif for headlines and contract text, a grotesk
        // for everything else, and the wordmark on its own. There is no
        // monospace voice any more: `font-mono` is kept as a name so
        // numbers still line up, but it renders the grotesk with tabular
        // figures (globals.css).
        display: ["var(--font-serif)", "Georgia", "serif"],
        clause: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "system-ui", "sans-serif"],
        wordmark: ["var(--font-wordmark)", "var(--font-sans)", "sans-serif"],
      },
      fontSize: {
        // Headings never drop below weight 500. Body never exceeds 600. If
        // something needs weight, make it Newsreader, not bolder Inter.
        // One scale, two jobs: the serif sizes carry headlines, the
        // grotesk sizes carry reading. Headlines are 500, never bold.
        display: [
          "clamp(44px, 6.2vw, 84px)",
          { lineHeight: "1.02", fontWeight: "500", letterSpacing: "-0.025em" },
        ],
        // The landing headline: one step above display, as a named size so the scale stays honest.
        "display-hero": [
          "clamp(44px, 6.4vw, 92px)",
          { lineHeight: "1", fontWeight: "500", letterSpacing: "-0.03em" },
        ],
        // The greeting on Documents, the one centred hero inside the product.
        greeting: [
          "clamp(32px, 3.4vw, 48px)",
          { lineHeight: "1.1", fontWeight: "500", letterSpacing: "-0.02em" },
        ],
        // Material 3 typography, applied to the scale without changing a
        // size or a family: line height follows M3's ratios (tight on
        // headlines, 1.5 body, 1.43 meta, 1.33 label), tracking opens up as
        // the text gets smaller (M3 body and label carry +0.25 to +0.5px),
        // and label text is medium, as M3's label styles are. Emphasis
        // (selected, active, primary action) is 500 to 600 on the same size.
        // The product has six type steps and no others: 12 label, 14 meta,
        // 16 body, 20 h3, 26 h2, 40 h1 (the display sizes above are the
        // marketing headlines). `lead`, `small` and `notation` are aliases of
        // the nearest step, kept so older screens keep compiling; do not use
        // them in new code. Held by lib/typeScale.test.ts.
        h1: ["clamp(30px, 3vw, 40px)", { lineHeight: "1.2", fontWeight: "500", letterSpacing: "-0.02em" }],
        h2: ["26px", { lineHeight: "1.25", fontWeight: "500", letterSpacing: "-0.015em" }],
        h3: ["20px", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "-0.005em" }],
        lead: ["20px", { lineHeight: "1.4", fontWeight: "400" }], // alias of h3's size
        body: ["16px", { lineHeight: "1.5", fontWeight: "400", letterSpacing: "0.03em" }],
        meta: ["14px", { lineHeight: "1.43", fontWeight: "400", letterSpacing: "0.018em" }],
        small: ["14px", { lineHeight: "1.43", fontWeight: "400", letterSpacing: "0.018em" }], // alias of meta
        notation: ["14px", { lineHeight: "1.43", fontWeight: "400", letterSpacing: "0.018em" }], // alias of meta
        // Chips, state text, counts and short metadata only. Anything a
        // person has to read (a finding, a note, a checklist row, a table
        // cell) is `meta` or larger.
        label: ["12px", { lineHeight: "16px", fontWeight: "500", letterSpacing: "0.04em" }],
      },
      letterSpacing: {
        notation: "0.08em",
      },
      spacing: {
        // 4px base. Generous around decisions, compact around supporting
        // information.
        decision: "3rem", // 48px · around a decision
        18: "4.5rem",
      },
      maxWidth: {
        measure: "68ch", // the document's reading measure
      },
      borderRadius: {
        // Round, everywhere, and never square: one family of curves.
        // Buttons and labels are pills; fields and small controls 12px;
        // cards 20px; modals and page panels 28px.
        control: "12px",
        card: "20px",
        modal: "28px",
        // The calmer document page: clause card, controls, badges.
        "calm-card": "12px",
        "calm-control": "8px",
        "calm-badge": "5px",
      },
      boxShadow: {
        // No elevation. Surfaces are separated by hairlines, and the one
        // layer that sits over the work (menus, the palette, a sheet) is
        // outlined in ink rather than lifted.
        card: "none",
        float: "0 0 0 1px rgb(var(--c-text-primary))",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  // Container queries: the document canvas changes width when the finding
  // panel opens, so its internal layout has to answer to the pane it sits
  // in rather than to the viewport.
  //
  // Imported, not required: when the dev server reloads this file Node loads
  // it as an ES module, where `require` does not exist, and the server died.
  plugins: [
    animate,
    containerQueries,
    plugin(({ addBase }) =>
      addBase({
        ":root": { ...channels("light"), colorScheme: "light" },
      }),
    ),
  ],
};

export default config;
