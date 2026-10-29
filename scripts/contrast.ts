/**
 * WCAG 2 contrast, from relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * Pure functions, so the test and a command-line run share one calculation:
 *   npx tsx scripts/contrast.ts
 */

function channel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a #RRGGBB colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Contrast ratio of two colours, 1 to 21, whichever is the lighter. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA: 4.5 for body text, 3 for large text and graphics. */
export const AA_TEXT = 4.5;
export const AA_LARGE_OR_GRAPHIC = 3;

if (process.argv[1]?.endsWith("contrast.ts") && process.argv[2]) {
  console.log(contrast(process.argv[2], process.argv[3] ?? "#FFFFFF").toFixed(2));
}
