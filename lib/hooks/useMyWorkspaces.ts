"use client"

import { useEffect, useState } from "react"

export type MyWorkspace = { id: string; name: string; role: string; isPersonal: boolean; brandingColor?: string | null }

/**
 * Lists every workspace the current user belongs to - their own personal
 * workspace plus any client workspace they were invited into (as editor,
 * client_reviewer, or viewer). Unlike useAgency, this has no Agency-plan
 * gate: an invited teammate has no plan of their own to check, they just
 * need to see and switch into the workspace(s) they were added to.
 */
export function useMyWorkspaces() {
  const [workspaces, setWorkspaces] = useState<MyWorkspace[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch("/api/workspaces/mine")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : [])
      })
      .catch(() => {
        if (active) setWorkspaces([])
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  return { workspaces, isLoading }
}
