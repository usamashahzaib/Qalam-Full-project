import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Try Qalam - Interactive Demo",
  description:
    "See Qalam in action. Write a LinkedIn post, explore a sample voice profile, and browse a demo archive without signing in.",
  path: "/demo",
  index: false,
})

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
