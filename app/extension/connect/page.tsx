import type { Metadata } from "next"
import { ExtensionConnectCard } from "@/components/extension/ExtensionConnectCard"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Connect Qalam for LinkedIn",
  description: "Create a secure connection code for the Qalam LinkedIn extension.",
  path: "/extension/connect",
  index: false,
})

export default function ExtensionConnectPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(204,235,228,0.8),_transparent_42%),#f7faf9] px-5 pb-16 pt-28 sm:px-8">
      <div className="mx-auto max-w-2xl"><ExtensionConnectCard /></div>
    </main>
  )
}
