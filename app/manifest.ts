import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Qalam LinkedIn Publishing",
    short_name: "Qalam",
    description:
      "Draft, review, approve, and schedule LinkedIn posts, carousels, and comments from your saved writing examples.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fafaf8",
    theme_color: "#0d4a45",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "New Post",
        short_name: "Write",
        description: "Start a new LinkedIn post",
        url: "/writer?compose=new",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Planner",
        short_name: "Plan",
        description: "Open your content calendar",
        url: "/calendar",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
