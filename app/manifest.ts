import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Qalam",
    short_name: "Qalam",
    description:
      "AI LinkedIn writer with voice memory, better drafts, scheduling, and direct publishing.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fafaf8",
    theme_color: "#0d4a45",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "New Post",
        short_name: "Write",
        description: "Start a new LinkedIn post",
        url: "/writer?compose=new",
        icons: [{ src: "/icon.png", sizes: "96x96" }],
      },
      {
        name: "Planner",
        short_name: "Plan",
        description: "Open your content calendar",
        url: "/calendar",
        icons: [{ src: "/icon.png", sizes: "96x96" }],
      },
    ],
  }
}
