import type { Config } from "tailwindcss";

// Brand Board V2.0 · 22 Sep 2026. A document is mostly paper: colour
// appears where a decision has been made, and nowhere else. One accent
// does almost all the work; the semantic set below carries citation and
// review status only and is never used decoratively.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#1B4332",
          hover: "#265E4A",
          fg: "#FFFFFF",
        },
        ink: "#141414",
        "muted-fg": "#5A5A5A",
        line: "#E5E5E0",
        // The page is white. Panels are told apart by hairlines, not tint.
        canvas: "#FFFFFF",
        paper: "#FFFFFF",
        parchment: "#F8F5EE",

        // Semantic tokens · citation and review status only.
        verified: "#2D6A4F", // citation resolved, advocate approved (6.3:1)
        flagged: "#9B2C2C", // high-severity finding, blocked citation (7.4:1)
        // caution measures 3.7:1, which clears the floor for badge fills but
        // not for text. As text it deepens to #92600A (5.2:1). Board V2.0
        // specifies both values; caution-fg is the text/icon colour.
        caution: { DEFAULT: "#B7791F", fg: "#92600A" },
        info: "#2C5282", // layer badges only, never decorative (7.8:1)
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
        h1: ["clamp(32px, 3.6vw, 48px)", { lineHeight: "1.08", fontWeight: "500", letterSpacing: "-0.02em" }],
        h2: ["clamp(24px, 2.2vw, 30px)", { lineHeight: "1.15", fontWeight: "500", letterSpacing: "-0.015em" }],
        h3: ["19px", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "-0.01em" }],
        lead: ["19px", { lineHeight: "1.55", fontWeight: "400" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        meta: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        // Helper text and fine print. Same measure as meta; kept as its own
        // name because older screens were written against it.
        small: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        notation: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        // State labels, counts and table headings inside the application.
        // Dense surfaces carry a lot of small facts; at 13px uppercase mono
        // they shouted over the content they describe.
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
      },
      boxShadow: {
        // No elevation. Surfaces are separated by hairlines, and the one
        // layer that sits over the work (menus, the palette, a sheet) is
        // outlined in ink rather than lifted.
        card: "none",
        float: "0 0 0 1px #141414",
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
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
