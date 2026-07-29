import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Content Calendar" }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate requiredPlan="Solo" feature="Planner">{children}</PlanGate>
}
