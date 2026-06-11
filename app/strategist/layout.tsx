import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Qalam Strategist",
  description: "Private Qalam strategy chat workspace.",
  robots: { index: false, follow: false },
}

export default function StrategistLayout({ children }: { children: React.ReactNode }) {
  return children
}
