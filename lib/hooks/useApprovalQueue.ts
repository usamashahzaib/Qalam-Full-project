"use client"

import { useCallback, useEffect, useState } from "react"
import { canAccessPlan } from "@/lib/entitlements"

export type ApprovalRow = {
  id: string
  post_id: string | null
  reviewer_email: string
  post_title: string
  post_content: string
  status: "pending" | "approved" | "rejected"
  message: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export type StatusMsg = { text: string; type: "info" | "error" | "success" }

export function useApprovalQueue(plan: string) {
  const canUse = canAccessPlan(plan, "Pro")

  const [approvals, setApprovals] = useState<ApprovalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusMsg | null>(null)

  const showStatus = useCallback((text: string, type: StatusMsg["type"]) => {
    setStatus({ text, type })
    if (type !== "error") setTimeout(() => setStatus(null), 4000)
  }, [])

  const fetchApprovals = useCallback(async () => {
    if (!canUse) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch("/api/approvals")
      const data = await res.json() as { approvals?: ApprovalRow[] }
      setApprovals(data.approvals || [])
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [canUse])

  useEffect(() => { void fetchApprovals() }, [fetchApprovals])

  const addApproval = useCallback((row: ApprovalRow) => {
    setApprovals((prev) => [row, ...prev])
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => prev === id ? null : id)
  }, [])

  const pending = approvals.filter((a) => a.status === "pending")
  const resolved = approvals.filter((a) => a.status !== "pending")

  return {
    canUse,
    approvals, isLoading,
    sendModalOpen, setSendModalOpen,
    expandedId, toggleExpanded,
    status,
    showStatus,
    fetchApprovals, addApproval,
    pending, resolved,
  }
}
