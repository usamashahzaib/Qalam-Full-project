import { useState, useEffect } from "react"

interface QueueStatusState {
  position: number
  message: string
  rateLimited: boolean
  remaining: number
  resetTime: number
}

export function useQueueStatus(requestId: string | null) {
  const [status, setStatus] = useState<QueueStatusState | null>(null)

  useEffect(() => {
    if (!requestId) return
    let active = true

    const poll = async () => {
      try {
        const res = await fetch(`/api/queue/status?requestId=${requestId}`)
        if (!res.ok || !active) return
        const data = await res.json()

        if (data.status === "completed") {
          setStatus(null)
          return
        }

        if (active) {
          setStatus({
            position: data.position ?? 1,
            message: data.message ?? "Processing...",
            rateLimited: data.rateLimited ?? false,
            remaining: data.remaining ?? 0,
            resetTime: data.resetTime ?? 0,
          })
        }
      } catch {
        // swallow network errors silently
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [requestId])

  return status
}
