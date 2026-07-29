import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Career Network" }

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGate
      requiredPlan="Pro"
      feature="Career Network"
      description="Upgrade to Pro to publish recruiter visibility and search opted-in candidates."
    >
      {children}
    </PlanGate>
  )
}
