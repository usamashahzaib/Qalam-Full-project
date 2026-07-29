import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Approvals" }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate requiredPlan="Pro" feature="Approvals">{children}</PlanGate>
}
