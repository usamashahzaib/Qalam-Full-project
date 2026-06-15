// Draft usage tracking — no-ops; server-side limits are authoritative (API /generate)
export const getDraftUsageKey = (_workspaceId: string, _month?: string): string => ""
export const readDraftUsage = (_workspaceId: string): number => 0
export const incrementDraftUsage = (_workspaceId: string): number => 0
