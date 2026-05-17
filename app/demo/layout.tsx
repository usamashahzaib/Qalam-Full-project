import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Try Qalam — Interactive Demo",
  description:
    "See Qalam in action. Write a LinkedIn post, explore your voice profile, and browse a sample archive — no sign-up required.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
