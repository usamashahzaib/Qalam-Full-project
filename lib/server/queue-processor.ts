import { Redis } from "@upstash/redis"
import { callAi } from "@/lib/server/ai-router"

let redis: Redis | null = null
let interval: ReturnType<typeof setInterval> | null = null

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || ""
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  if (!url.startsWith("https://") || url.includes("...") || !token || token.includes("...")) return null
  redis ??= new Redis({ url, token })
  return redis
}

export type QueueItem = {
  id: string
  userId: string
  plan: string
  type: "generate" | "carousel" | "voice"
  payload: Record<string, unknown>
  timestamp: number
  status: "pending" | "processing" | "completed" | "failed"
  result?: unknown
}

const priorityForPlan = (plan: string) => (plan.toLowerCase() === "free" ? 3 : plan.toLowerCase() === "solo" ? 2 : 1)

async function handleItem(item: QueueItem) {
  if (item.type === "generate") {
    const topic = String(item.payload.topic || "")
    const role = String(item.payload.role || "founder")
    const content = await callAi(
      "Create a strong LinkedIn post. Return plain text.",
      `Topic: ${topic}\nRole: ${role}`,
      { temperature: 0.8 }
    )
    return { content }
  }

  if (item.type === "carousel") {
    const topic = String(item.payload.topic || "")
    const slideCount = Number(item.payload.slideCount || 5)
    const content = await callAi(
      "Create a LinkedIn carousel outline as JSON.",
      `Topic: ${topic}\nSlides: ${slideCount}`,
      { json: true, temperature: 0.7 }
    )
    return JSON.parse(content)
  }

  return { accepted: true, type: item.type }
}

export async function processQueue() {
  const activeRedis = getRedis()
  if (!activeRedis) return { processed: 0, redis: false }

  let processed = 0
  for (const priority of [1, 2, 3]) {
    while (processed < 10) {
      const raw = await activeRedis.rpop<string>(`queue:priority:${priority}`)
      if (!raw) break

      const item = JSON.parse(raw) as QueueItem
      const statusKey = `queue:item:${item.id}`
      try {
        await activeRedis.set(statusKey, { ...item, status: "processing" })
        const result = await handleItem(item)
        await activeRedis.set(statusKey, { ...item, status: "completed", result })
      } catch (error) {
        await activeRedis.set(statusKey, {
          ...item,
          status: "failed",
          result: { error: error instanceof Error ? error.message : "queue_failed" },
        })
      }
      processed += 1
    }
  }

  return { processed, redis: true }
}

export async function getQueueStatus(userId: string) {
  const activeRedis = getRedis()
  if (!activeRedis) return { position: 0, estimatedWait: 0 }

  let position = 0
  for (const priority of [1, 2, 3]) {
    const items = await activeRedis.lrange<string>(`queue:priority:${priority}`, 0, -1)
    for (const raw of items.reverse()) {
      position += 1
      const item = JSON.parse(raw) as QueueItem
      if (item.userId === userId) return { position, estimatedWait: position * 3 }
    }
  }

  return { position: 0, estimatedWait: 0 }
}

export function scheduleQueueProcessor() {
  if (!getRedis()) return false
  if (interval) return true
  interval = setInterval(() => {
    void processQueue()
  }, 5000)
  return true
}

export { getRedis, priorityForPlan }
