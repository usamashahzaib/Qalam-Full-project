"use client"

import { useEffect, useState } from "react"
import { isValidLinkedInUrl } from "@/lib/validation"
import type { WorkspaceProfile } from "@/components/providers/WorkspaceProvider"

interface ProfileFormDeps {
  profile: WorkspaceProfile
  userName?: string
  saveProfile: (updates: WorkspaceProfile) => Promise<void>
}

export function useProfileForm({ profile, userName = "", saveProfile }: ProfileFormDeps) {
  const [draft, setDraft] = useState({
    name: profile.name || userName,
    title: profile.title,
    linkedinUrl: profile.linkedinUrl,
    industry: profile.industry,
    tone: profile.tone,
    goals: profile.goals.join(", "),
  })
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "saving") return
    setDraft({
      name: profile.name || userName,
      title: profile.title,
      linkedinUrl: profile.linkedinUrl,
      industry: profile.industry,
      tone: profile.tone,
      goals: profile.goals.join(", "),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, userName])

  const onSave = async () => {
    setStatus("saving")
    setError(null)
    try {
      if (!isValidLinkedInUrl(draft.linkedinUrl)) throw new Error("Enter a valid LinkedIn profile or company URL.")
      await saveProfile({
        name: draft.name.trim(),
        title: draft.title.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        industry: draft.industry.trim(),
        tone: draft.tone.trim(),
        goals: draft.goals.split(",").map((item) => item.trim()).filter(Boolean),
      })
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2500)
    } catch (e) {
      setStatus("error")
      setError((e as Error).message || "Save failed")
    }
  }

  return { draft, setDraft, status, error, onSave }
}
