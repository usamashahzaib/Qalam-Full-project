"use client"

import { useAppMode } from "@/lib/hooks/useAppMode"

export function DashboardContent({
  linkedinContent,
  careerContent,
}: {
  linkedinContent: React.ReactNode
  careerContent: React.ReactNode
}) {
  const { mode } = useAppMode()
  return <>{mode === "career" ? careerContent : linkedinContent}</>
}
