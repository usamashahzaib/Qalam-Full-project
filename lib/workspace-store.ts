import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from "@/lib/api/client"

export const canUseRemoteWorkspace = () => {
  if (typeof window === "undefined") return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export const loadWorkspaceState = async (workspaceKey?: string) => {
  const response = await loadWorkspaceSnapshot(workspaceKey)
  return response.state
}

export const saveWorkspaceState = async (state: Record<string, unknown>, workspaceKey?: string) => {
  await saveWorkspaceSnapshot(state, workspaceKey)
}
