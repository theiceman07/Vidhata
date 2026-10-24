import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

// Design board "Before, and a safe After" (v1 conservative). One colour,
// one meaning: green is done or brand, blue is in progress (advocate-side
// work), marigold is "your move" (the client has something to do), vermilion
// is blocked or a finding. These hex values are the single source of truth;
// the contrast test (lib/contrast.test.ts) reads them from here.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBF9F4", // the page
        surface: "#FFFFFF",
        sand: "#F2EEE5", // quiet panels
        line: "#E4DED1",
        ink: "#14211C",
        muted: "#4F5B55",
        brand: { DEFAULT: "#0F5C45", deep: "#0B4A37", tint: "#E2F0E8" },
        done: { DEFAULT: "#1B7F5A", text: "#146B4D", tint: "#E3F4EB" },
        progress: { DEFAULT: "#1F5E99", tint: "#E6EFF9" },
        move: { DEFAULT: "#F2A71B", text: "#7A4E00", tint: "#FDF1D6" },
        blocked: { DEFAULT: "#B63A2B", tint: "#FBE7E3" },
        night: "#0E1F1A",
        shell: "#000000", // the portal rail and its mobile bar
        // The calmer document page (app/(client)/documents/[id]). Scoped to it
        // through CalmProvider; nothing else reads these.
        calm: {
          canvas: "#F5F3ED",
          surface: "#FFFFFF",
          muted: "#EFEEE8",
          ink: "#343A40",
          strong: "#263B33",
          secondary: "#68716D",
          border: "#DFDDD5",
          "border-strong": "#C8C8BE",
          divider: "#E8E6DF",
          accent: "#B58A49",
          "accent-muted": "#F1E8D8",
          success: "#356A50",
          "success-muted": "#E7EFE8",
          warning: "#88652F",
          "warning-muted": "#F5EEDC",
          focus: "#547C69",
        },
        mint: "#5FC79A", // ticks on night

        // Aliases for the pre-board names, kept because about 100 files and
        // the home page still use them. Each points at its new meaning and
        // goes when its last user is migrated.
        accent: { DEFAULT: "#0F5C45", hover: "#0B4A37", fg: "#FFFFFF" }, // brand, brand-deep, white
        "muted-fg": "#4F5B55", // muted
        canvas: "#FBF9F4", // paper
        parchment: "#F2EEE5", // sand
        verified: "#1B7F5A", // done
        flagged: "#B63A2B", // blocked
        caution: { DEFAULT: "#F2A71B", fg: "#7A4E00" }, // move, move-text
        info: "#1F5E99", // progress
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
        // The product has six type steps and no others: 12 label, 14 meta,
        // 16 body, 20 h3, 26 h2, 40 h1 (the display sizes above are the
        // marketing headlines). `lead`, `small` and `notation` are aliases of
        // the nearest step, kept so older screens keep compiling; do not use
        // them in new code. Held by lib/typeScale.test.ts.
        h1: ["clamp(30px, 3vw, 40px)", { lineHeight: "1.08", fontWeight: "500", letterSpacing: "-0.02em" }],
        h2: ["26px", { lineHeight: "1.2", fontWeight: "500", letterSpacing: "-0.015em" }],
        h3: ["20px", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "-0.01em" }],
        lead: ["20px", { lineHeight: "1.55", fontWeight: "400" }], // alias of h3's size
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        meta: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["14px", { lineHeight: "1.5", fontWeight: "400" }], // alias of meta
        notation: ["14px", { lineHeight: "1.5", fontWeight: "400" }], // alias of meta
        // Chips, state text, counts and short metadata only. Anything a
        // person has to read (a finding, a note, a checklist row, a table
        // cell) is `meta` or larger.
        label: ["12px", { lineHeight: "16px", fontWeight: "400" }],
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
        float: "0 0 0 1px #14211C",
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
  plugins: [animate, containerQueries],
};

export default config;
