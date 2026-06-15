"use client"

import { useEffect, useMemo, useState } from "react"

type AgencyClient = { id: string; client_name: string }

type UseAgencyReturn = {
  clients: AgencyClient[]
  clientWorkspaces: AgencyClient[]
  isLoadingClients: boolean
}

export function useAgency({ isAgencyPlan }: { isAgencyPlan: boolean }): UseAgencyReturn {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)

  useEffect(() => {
    if (!isAgencyPlan) return
    let active = true
    setIsLoadingClients(true)
    fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        const seen = new Set<string>()
        setClients(
          Array.isArray(data.clients)
            ? data.clients.filter((client: AgencyClient) => {
                const name = client.client_name?.trim()
                const key = name?.toLowerCase()
                if (!name || name === "Personal Workspace" || !key || seen.has(key)) return false
                seen.add(key)
                return true
              })
            : []
        )
      })
      .catch(() => {
        if (!active) return
        setClients([])
      })
      .finally(() => {
        if (!active) return
        setIsLoadingClients(false)
      })
    return () => {
      active = false
    }
  }, [isAgencyPlan])

  const clientWorkspaces = useMemo(
    () =>
      clients.filter((client, index, list) => {
        const name = client.client_name.trim()
        return (
          name !== "Personal Workspace" &&
          list.findIndex(
            (item) => item.id === client.id || item.client_name.trim().toLowerCase() === name.toLowerCase()
          ) === index
        )
      }),
    [clients]
  )

  return { clients, clientWorkspaces, isLoadingClients }
}
