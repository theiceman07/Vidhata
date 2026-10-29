/**
 * Advocate AI colour: black, white, one blue. Status = solid fills, white
 * labels. These are the only colours in the product, light and dark, named as
 * the design frames name them. tailwind.config.ts turns them into CSS custom
 * properties, and the contrast test measures both modes from here. Do not add
 * a value that is not on the board.
 */
export type Mode = "light" | "dark";

export const PALETTE: Record<string, Record<Mode, string>> = {
  "bg-canvas": { light: "#FFFFFF", dark: "#000000" },
  "bg-subtle": { light: "#F7F7F7", dark: "#0A0A0A" },
  "text-primary": { light: "#000000", dark: "#FFFFFF" },
  "text-secondary": { light: "#525252", dark: "#A3A3A3" },
  "text-muted": { light: "#8A8A8A", dark: "#6B6B6B" },
  "border-default": { light: "#E5E5E5", dark: "#222222" },
  "border-strong": { light: "#000000", dark: "#FFFFFF" },
  "tile-default": { light: "#FAFAFA", dark: "#161616" },
  "tile-hover": { light: "#F5F5F5", dark: "#202020" },
  "tile-selected": { light: "#F7F7FF", dark: "#0B0C24" },
  "tile-inverse": { light: "#000000", dark: "#FFFFFF" },
  "accent-fill": { light: "#4044F9", dark: "#4044F9" },
  "accent-hover": { light: "#2F33D6", dark: "#5B5FFA" },
  "accent-text": { light: "#4044F9", dark: "#8A8DFF" },
  "accent-on": { light: "#FFFFFF", dark: "#FFFFFF" },
  "highlight-bg": { light: "#FFF3A3", dark: "#3D3500" },
  "highlight-text": { light: "#000000", dark: "#FFE866" },
  "status-verified": { light: "#4044F9", dark: "#4044F9" },
  "status-accepted": { light: "#0C8F45", dark: "#0C8F45" },
  "status-rejected": { light: "#E5372B", dark: "#E5372B" },
  "status-pending": { light: "#E35D05", dark: "#E35D05" },
  "status-on": { light: "#FFFFFF", dark: "#FFFFFF" },
};

export function hexToChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Hex of a token in one mode, for tests and the few places CSS variables cannot reach. */
export function hexOf(token: string, mode: Mode): string {
  const v = PALETTE[token];
  if (!v) throw new Error(`No palette token ${token}`);
  return v[mode];
}
