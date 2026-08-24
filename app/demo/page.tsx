import { DemoClient } from "./DemoClient"

type DemoTab = "writer" | "voice" | "archive"

const isDemoTab = (value: string | undefined): value is DemoTab => (
  value === "writer" || value === "voice" || value === "archive"
)

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  return <DemoClient initialTab={isDemoTab(tab) ? tab : "writer"} />
}
