export type WorkspaceEventInput = {
  id?: string
  workspaceKey?: string
  type?: string
  payload?: Record<string, unknown>
  createdAt?: string
}

export type WorkspaceJobInput = {
  id?: string
  workspaceKey?: string
  type?: string
  status?: string
  title?: string
  payload?: Record<string, unknown>
  createdAt?: string
}

const asJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  const data = (text ? JSON.parse(text) : null) as T & { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `request_failed_${response.status}`)
  }
  return data
}

const requestJson = <T>(path: string, options: RequestInit = {}) =>
  fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }).then(asJson<T>)

const withWorkspaceKey = (path: string, workspaceKey?: string) =>
  workspaceKey ? `${path}${path.includes("?") ? "&" : "?"}workspaceKey=${encodeURIComponent(workspaceKey)}` : path

export const loadWorkspaceSnapshot = (workspaceKey?: string) =>
  requestJson<{ state: Record<string, unknown> | null; updatedAt: string | null }>(
    withWorkspaceKey("/api/workspace", workspaceKey)
  )

export const saveWorkspaceSnapshot = (state: Record<string, unknown>, workspaceKey?: string) =>
  requestJson<{ saved: boolean; row: unknown }>("/api/workspace", {
    method: "PUT",
    body: JSON.stringify({ workspaceKey, state }),
  })

export const trackWorkspaceEvent = (
  type: string,
  payload: Record<string, unknown> = {},
  workspaceKey?: string
) =>
  requestJson<{ saved: boolean; event: unknown }>("/api/events", {
    method: "POST",
    body: JSON.stringify({
      workspaceKey,
      type,
      payload,
      createdAt: new Date().toISOString(),
    }),
  })

export const fetchWorkspaceEvents = (limit = 100, workspaceKey?: string) =>
  requestJson<{ events: unknown[] }>(withWorkspaceKey(`/api/events?limit=${limit}`, workspaceKey))

export const fetchWorkspaceJobs = (type = "", limit = 100, workspaceKey?: string) =>
  requestJson<{ jobs: unknown[] }>(
    withWorkspaceKey(`/api/jobs?type=${encodeURIComponent(type)}&limit=${limit}`, workspaceKey)
  )

export const createWorkspaceJob = ({
  type,
  title,
  payload = {},
  status = "completed",
  workspaceKey,
}: WorkspaceJobInput) =>
  requestJson<{ saved: boolean; job: unknown }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      workspaceKey,
      type,
      title,
      status,
      payload,
      createdAt: new Date().toISOString(),
    }),
  })

export const analyzeCompetitorPaste = ({
  profileId,
  profileName,
  platform,
  sourceText,
  workspaceKey,
}: {
  profileId?: string
  profileName?: string
  platform?: string
  sourceText?: string
  workspaceKey?: string
}) =>
  requestJson<{ analysis: unknown; job: unknown }>("/api/competitors/analyze", {
    method: "POST",
    body: JSON.stringify({
      workspaceKey,
      profileId,
      profileName,
      platform,
      sourceText,
    }),
  })

export const shareToLinkedIn = ({
  content,
  media,
  postId,
  workspaceKey,
}: {
  content: string
  media?: { id?: string; title?: string }
  postId?: string | null
  workspaceKey?: string
}) =>
  requestJson<{ shared: boolean; postUrn: string | null }>("/api/linkedin/share", {
    method: "POST",
    body: JSON.stringify({ content, media, postId, workspaceKey }),
  })
