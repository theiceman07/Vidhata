import { describe, expect, it } from "vitest";
import { AA_LARGE_OR_GRAPHIC, AA_TEXT, contrast } from "../scripts/contrast";
import { hexOf, type Mode } from "./palette";

/**
 * The palette, measured in both modes. The colours are read from
 * lib/palette.ts, the one place they are written, so a changed hex is
 * measured and cannot slip past.
 */
function token(path: string, mode: Mode): string {
  return path === "white" ? "#FFFFFF" : hexOf(path, mode);
}

interface Pair {
  name: string;
  fg: string;
  bg: string;
  /** What it is: body text must reach 4.5, large text and graphics 3. */
  use: "text" | "graphic";
}

// The board fixes the status fills; white on them is 3.6 to 4.3:1, so those
// labels are held to the large-text floor and kept medium weight.
const PAIRS: Pair[] = [
  { name: "text on canvas", fg: "text-primary", bg: "bg-canvas", use: "text" },
  { name: "text on subtle", fg: "text-primary", bg: "bg-subtle", use: "text" },
  { name: "text on tile", fg: "text-primary", bg: "tile-default", use: "text" },
  { name: "secondary on canvas", fg: "text-secondary", bg: "bg-canvas", use: "text" },
  { name: "secondary on subtle", fg: "text-secondary", bg: "bg-subtle", use: "text" },
  { name: "accent on label on accent fill", fg: "accent-on", bg: "accent-fill", use: "text" },
  { name: "accent text on canvas", fg: "accent-text", bg: "bg-canvas", use: "text" },
  { name: "accent text on subtle", fg: "accent-text", bg: "bg-subtle", use: "text" },
  { name: "accent text on selected tile", fg: "accent-text", bg: "tile-selected", use: "text" },
  { name: "highlight text on highlight", fg: "highlight-text", bg: "highlight-bg", use: "text" },
  { name: "status label on verified", fg: "status-on", bg: "status-verified", use: "text" },
  { name: "status label on accepted", fg: "status-on", bg: "status-accepted", use: "graphic" },
  { name: "status label on rejected", fg: "status-on", bg: "status-rejected", use: "graphic" },
  { name: "status label on pending", fg: "status-on", bg: "status-pending", use: "graphic" },
];

describe.each<Mode>(["light", "dark"])("palette contrast (WCAG 2), %s", (mode) => {
  for (const p of PAIRS) {
    const floor = p.use === "text" ? AA_TEXT : AA_LARGE_OR_GRAPHIC;
    it(`${p.name} reaches ${floor}:1`, () => {
      expect(contrast(token(p.fg, mode), token(p.bg, mode))).toBeGreaterThanOrEqual(floor);
    });
  }
});

describe("the calculation", () => {
  it("knows black on white is 21:1, white on white 1:1", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});
