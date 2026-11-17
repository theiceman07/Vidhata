/**
 * The address people are told to write to: one value, set per deploy with
 * NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL. The /contact form is a mock that sends nothing, so no screen
 * points at it. While this is unset (or is not an address) a screen shows no address and no link,
 * and says only what is true. No address is written into the source.
 */
export function supportEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
