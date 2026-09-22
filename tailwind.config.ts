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
        canvas: "#FAFAF8",
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
        // Three voices. Type carries the difference between what a machine
        // proposed and what a person decided.
        display: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Headings never drop below weight 500. Body never exceeds 600. If
        // something needs weight, make it Newsreader, not bolder Inter.
        display: [
          "clamp(56px, 9vw, 88px)",
          { lineHeight: "1.05", fontWeight: "500", letterSpacing: "-0.02em" },
        ],
        h1: ["32px", { lineHeight: "1.3", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "500" }],
        h3: ["18px", { lineHeight: "1.4", fontWeight: "500" }],
        body: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        meta: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        notation: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
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
        // Three interface radii, one special case for avatars. Without
        // hierarchy a dialog reads like a text field.
        control: "6px",
        card: "8px",
        modal: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,20,0.04)",
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
  plugins: [require("tailwindcss-animate")],
};

export default config;
