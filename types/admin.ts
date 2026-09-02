export interface AdminOverride {
  plan_override: string | null
  draft_limit_override: number | null
  workspace_limit_override: number | null
  feature_flags: Record<string, boolean> | null
  notes?: string | null
  expires_at?: string | null
}

export interface AdminUsage {
  aiDraftsUsed: number
  carouselsUsed: number
  hooksUsed: number
  analysesUsed: number
  competitorRunsUsed: number
  commentGenerationsUsed: number
}

export interface AdminUser {
  id: string
  externalId: string
  name: string
  email: string
  linkedInId: string
  currentPlan: string
  planExpiresAt?: string | null
  billingCycle: "monthly" | "quarterly" | "annual"
  draftsUsed: number
  workspaces: number
  override: AdminOverride | null
  usage: AdminUsage
}

export interface AuditLogEntry {
  id: string
  admin_email: string
  target_user_email: string
  action: string
  old_value: unknown
  new_value: unknown
  created_at: string
}

export interface AdminStats {
  totalUsers: number
  planCounts: { free: number; solo: number; pro: number; agency: number }
  usage: { totalDrafts: number; totalCarousels: number; totalHooks: number }
}

export interface CircuitState {
  groq: unknown
  gemini: unknown
}

export interface RecentUser {
  id: string
  email: string
  name: string
  joinedAt: string
}

export interface CronRunHealth {
  jobName: string
  lastStartedAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastError: string | null
  durationMs: number | null
  isStale: boolean
}
