"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { WorkspaceProfile } from "@/types/domain"

type ProfileContextValue = {
  profile: WorkspaceProfile
  isLoadingProfile: boolean
  saveProfile: (input: WorkspaceProfile) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

const defaultProfile: WorkspaceProfile = {
  name: "",
  title: "",
  linkedinUrl: "",
  industry: "",
  goals: [],
  tone: "",
}

export function ProfileProvider({ children, workspaceId }: { children: React.ReactNode; workspaceId: string }) {
  const [profile, setProfile] = useState<WorkspaceProfile>(defaultProfile)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true)
    try {
      const res = await fetch(`/api/voice-profile?workspaceKey=${encodeURIComponent(workspaceId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load profile")
      setProfile(data.profile ? { ...defaultProfile, ...data.profile } : defaultProfile)
    } catch {
      setProfile(defaultProfile)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveProfile = useCallback(async (input: WorkspaceProfile) => {
    const res = await fetch("/api/voice-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, workspaceKey: workspaceId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Failed to save profile")
    setProfile(data.profile ? { ...defaultProfile, ...data.profile } : input)
  }, [workspaceId])

  return (
    <ProfileContext.Provider value={{ profile, isLoadingProfile, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}
