import type { MetadataRoute } from "next";
import { hexOf } from "@/lib/palette";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidhata",
    short_name: "Vidhata",
    start_url: "/",
    display: "browser",
    background_color: hexOf("bg-canvas", "light"),
    theme_color: hexOf("bg-canvas", "light"),
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
