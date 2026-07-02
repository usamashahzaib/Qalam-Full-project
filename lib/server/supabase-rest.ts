import "server-only"

import { createClient } from "@supabase/supabase-js"
import { env, requireSupabaseEnv } from "@/lib/server/env"

export function createServiceClient() {
  requireSupabaseEnv()
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type RestResponse<T> = {
  data: T
  headers: Headers
}

const parseBody = <T>(raw: string): T => {
  if (!raw) return null as T
  return JSON.parse(raw) as T
}

const key = () => env.supabaseServiceRoleKey

const headers = (prefer = "") => ({
  apikey: key(),
  Authorization: `Bearer ${key()}`,
  "Content-Type": "application/json",
  ...(prefer ? { Prefer: prefer } : {}),
})

const withTimeout = (init: RequestInit = {}, ms = 15000): { init: RequestInit; cleanup: () => void } => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const abort = () => controller.abort()
  init.signal?.addEventListener("abort", abort, { once: true })
  return {
    init: { ...init, signal: controller.signal },
    cleanup: () => {
      clearTimeout(timer)
      init.signal?.removeEventListener("abort", abort)
    },
  }
}

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<RestResponse<T>> => {
  const timed = withTimeout(init)
  const response = await fetch(url, timed.init).finally(timed.cleanup)
  const text = await response.text()
  const payload = parseBody<T>(text)
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: string }).message || "")
        : ""
    const error =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error || "")
        : ""
    const detail = `${message} ${error}`.trim()
    if (/Could not find the table 'public\.[^']+' in the schema cache/i.test(detail)) {
      throw new Error("schema_not_applied")
    }
    throw new Error(message || error || response.statusText || "request_failed")
  }
  return {
    data: payload,
    headers: response.headers,
  }
}

export const supabaseSelect = async <T>(table: string, query: string) => {
  requireSupabaseEnv()
  const { data } = await fetchJson<T[]>(`${env.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: headers(),
    cache: "no-store",
  })
  return data
}

export const supabaseInsert = async <T>(table: string, payload: unknown, prefer = "return=representation") => {
  requireSupabaseEnv()
  const body = JSON.stringify(Array.isArray(payload) ? payload : [payload])
  const { data } = await fetchJson<T[]>(`${env.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: headers(prefer),
    body,
    cache: "no-store",
  })
  return data
}

export const supabaseUpsert = async <T>(
  table: string,
  payload: unknown,
  onConflict: string
) => {
  requireSupabaseEnv()
  const body = JSON.stringify(Array.isArray(payload) ? payload : [payload])
  const prefer = "return=representation,resolution=merge-duplicates"
  const url = `${env.supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
  const { data } = await fetchJson<T[]>(url, {
    method: "POST",
    headers: headers(prefer),
    body,
    cache: "no-store",
  })
  return data
}

/**
 * PATCH one or more rows matching the given query filter.
 * Returns the updated rows.
 */
export const supabasePatch = async <T>(
  table: string,
  query: string,
  payload: unknown
) => {
  requireSupabaseEnv()
  const body = JSON.stringify(payload)
  const url = `${env.supabaseUrl}/rest/v1/${table}?${query}`
  const { data } = await fetchJson<T[]>(url, {
    method: "PATCH",
    headers: headers("return=representation"),
    body,
    cache: "no-store",
  })
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.warn(`[supabasePatch] No rows updated in '${table}' with filter '${query}'`)
  }
  return data
}

/**
 * Workspace-scoped client.
 *
 * Every query builder returned by .from() automatically injects
 * workspace_id = workspaceId so a missed filter can never leak
 * cross-tenant data.  Use .raw() to escape scoping for tables that
 * have no workspace_id column.
 */
export function createScopedClient(workspaceId: string) {
  const supabase = createServiceClient()

  function from(table: string) {
    return {
      /** SELECT — workspace_id filter is the first constraint; caller can chain more */
      select: (columns = "*") =>
        supabase.from(table).select(columns).eq("workspace_id", workspaceId),

      /** INSERT — forces workspace_id onto every row */
      insert: (data: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = (Array.isArray(data) ? data : [data]).map((r) => ({
          ...r,
          workspace_id: workspaceId,
        }))
        return supabase.from(table).insert(rows)
      },

      /** UPDATE — forces workspace_id WHERE clause */
      update: (data: Record<string, unknown>) =>
        supabase.from(table).update(data).eq("workspace_id", workspaceId),

      /** DELETE — forces workspace_id WHERE clause */
      delete: () =>
        supabase.from(table).delete().eq("workspace_id", workspaceId),

      /** Escape hatch: unscoped builder for joins / tables without workspace_id */
      raw: supabase.from(table),
    }
  }

  return { from }
}

/**
 * DELETE rows matching the given query filter.
 */
export const supabaseDelete = async (table: string, query: string) => {
  requireSupabaseEnv()
  const url = `${env.supabaseUrl}/rest/v1/${table}?${query}`
  await fetchJson<null>(url, {
    method: "DELETE",
    headers: headers("return=minimal"),
    cache: "no-store",
  })
}