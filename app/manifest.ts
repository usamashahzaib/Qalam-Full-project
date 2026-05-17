import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qalam",
    short_name: "Qalam",
    description:
      "Voice-aware LinkedIn publishing system with drafting, archive continuity, scheduling, and client workspaces.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#0d4a45",
    icons: [
      { src: "/qalam-mark.png", sizes: "512x512", type: "image/png" },
      { src: "/qalam-mark-light.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
