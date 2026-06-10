export const withClientParam = (path: string, clientId?: string | null) => {
  if (!clientId) return path
  const [base, hash] = path.split("#", 2)
  const joiner = base.includes("?") ? "&" : "?"
  const next = `${base}${joiner}client=${encodeURIComponent(clientId)}`
  return hash ? `${next}#${hash}` : next
}

export const withWorkspaceKey = (path: string, workspaceId?: string | null) => {
  if (!workspaceId) return path
  const [base, hash] = path.split("#", 2)
  const joiner = base.includes("?") ? "&" : "?"
  const next = `${base}${joiner}workspaceKey=${encodeURIComponent(workspaceId)}`
  return hash ? `${next}#${hash}` : next
}

export const persistWriterIntent = (post: unknown, scheduleDate?: string | null) => {
  if (typeof window === "undefined") return
  sessionStorage.setItem("writerLoad", JSON.stringify(post))
  if (scheduleDate) sessionStorage.setItem("writerScheduleDate", scheduleDate)
  else sessionStorage.removeItem("writerScheduleDate")
}
