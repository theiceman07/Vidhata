import { ImageResponse } from "next/og";
import { hexOf } from "@/lib/palette";

export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 };

/**
 * The link preview for the site: the promise, in the board's ink and paper.
 * An image route cannot read Tailwind tokens, so the three board colours are
 * written out here (from lib/palette.ts). The wordmark
 * face is not loaded: the image renderer takes no woff2, so the word is set in
 * its default sans.
 */
export function socialCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: hexOf("tile-inverse", "light"),
          color: hexOf("tile-inverse", "dark"),
          padding: "72px 80px",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em" }}>Vidhata</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 112,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            AI drafts. Advocates decide.
          </div>
          <div style={{ marginTop: 32, fontSize: 34, color: hexOf("text-secondary", "dark"), display: "flex" }}>
            Contracts for Indian startups and MSMEs. A named advocate signs off.
          </div>
        </div>
        <div style={{ height: 6, width: 160, background: hexOf("tile-inverse", "dark"), borderRadius: 3, display: "flex" }} />
      </div>
    ),
    SOCIAL_CARD_SIZE,
  );
}
