import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Library" }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate requiredPlan="Solo" feature="Library">{children}</PlanGate>
}
