import { ImageResponse } from "next/og";

// The home-screen icon. The same mark as app/icon.svg, rendered to PNG
// because iOS does not accept SVG touch icons. Coordinates are the
// favicon's, scaled from its 32-unit box.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="30.5"
            height="30.5"
            stroke="#141414"
            strokeWidth="1.5"
          />
          <path
            d="M6.5 7H13.5V8H12.3L17.1 20.4L22.6 8H20.6V7H25.8V8H24.4L16.7 25.2H15.5L8.4 8H6.5Z"
            fill="#141414"
          />
        </svg>
      </div>
    ),
    size,
  );
}
