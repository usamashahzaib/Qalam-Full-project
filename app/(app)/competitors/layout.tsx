import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Post Analyzer" }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate requiredPlan="Pro" feature="Research">{children}</PlanGate>
}
