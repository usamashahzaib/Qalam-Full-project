import type { Metadata } from "next"
import { PlanGate } from "@/components/PlanGate"

export const metadata: Metadata = { title: "Career Network" }

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlanGate
      requiredPlan="Free"
      feature="Career Network"
      description="Create an opt-in candidate profile. Verified recruiter search requires Pro."
    >
      {children}
    </PlanGate>
  )
}
