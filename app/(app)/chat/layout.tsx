import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "AI Strategist" }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate requiredPlan="Pro" feature="AI Strategist">{children}</PlanGate>
}
