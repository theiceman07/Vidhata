import { COMPANY } from "./company";

/**
 * The address people are told to write to. NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL overrides it per
 * deploy; otherwise it is the company address the owner gave (lib/config/company.ts, 25 Nov 2026),
 * shown in the footer, on both sign-in pages and on the 404. A value that is not an address is
 * ignored in favour of the company one.
 */
export function supportEmail(): string {
  const value = process.env.NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : COMPANY.email;
}
