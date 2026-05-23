import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qalam",
    short_name: "Qalam",
    description:
      "AI LinkedIn writer with voice memory, better drafts, scheduling, and direct publishing.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf8",
    theme_color: "#0d4a45",
    categories: ["productivity", "business"],
    icons: [
      { src: "/qalam-mark.png", sizes: "192x192", type: "image/png" },
      { src: "/qalam-mark.png", sizes: "512x512", type: "image/png" },
      { src: "/qalam-mark-light.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
