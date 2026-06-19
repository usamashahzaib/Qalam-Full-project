import { Redis } from "@upstash/redis"
import { getRedis } from "@/lib/server/redis"
import { callAi, type AiTask } from "@/lib/server/ai-router-v2"

let processorInterval: ReturnType<typeof setInterval> | null = null

export interface QueueItem {
  id: string
  userId: string
  plan: string
  type: "generate" | "carousel" | "voice"
  payload: Record<string, unknown>
  timestamp: string
  status: "pending" | "processing" | "completed" | "failed"
  result?: unknown
  error?: string
}

// Queues processed in priority order
const QUEUES = ["queue:pro", "queue:agency", "queue:free"] as const
const BATCH_SIZE = 10
const ITEM_TTL_SECONDS = 60 * 60 * 24 // 24 h

async function storeItem(r: Redis, item: QueueItem): Promise<void> {
  await r.set(`queue:item:${item.id}`, JSON.stringify(item), { ex: ITEM_TTL_SECONDS })
}

async function assertQueueEntitlement(item: QueueItem) {
  const { getPlanStatus } = await import("./plan-limits-v2")
  const { PLAN_LIMITS } = await import("@/lib/entitlements")
  const freshStatus = await getPlanStatus(item.userId)
  const freshLimits = PLAN_LIMITS[freshStatus.plan as keyof typeof PLAN_LIMITS]
  const carouselAllowed = freshLimits?.carouselGenerationsPerMonth === "unlimited" || (freshLimits?.carouselGenerationsPerMonth ?? 0) > 0
  if ((item.type === "voice" && !freshLimits?.voiceTraining) || (item.type === "carousel" && !carouselAllowed)) {
    throw new Error("plan_downgraded_queue_blocked")
  }
}

async function handleItem(item: QueueItem): Promise<unknown> {
  await assertQueueEntitlement(item)

  const taskMap: Record<QueueItem["type"], AiTask> = {
    generate: "post-generation",
    carousel: "carousel-outline",
    voice: "voice-profile",
  }

  if (item.type === "generate") {
    const topic = String(item.payload.topic ?? "")
    const role = String(item.payload.role ?? "founder")
    const content = await callAi(
      taskMap.generate,
      "Create a strong LinkedIn post. Return plain text.",
      `Topic: ${topic}\nRole: ${role}`,
      { temperature: 0.8 },
    )
    return { content }
  }

  if (item.type === "carousel") {
    const topic = String(item.payload.topic ?? "")
    const slideCount = Number(item.payload.slideCount ?? 5)
    const content = await callAi(
      taskMap.carousel,
      "Create a LinkedIn carousel outline as JSON.",
      `Topic: ${topic}\nSlides: ${slideCount}`,
      { json: true, temperature: 0.7 },
    )
    return JSON.parse(content)
  }

  // voice: stub - wired up when voice pipeline is ready
  return { accepted: true, type: item.type }
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const r = getRedis()
  if (!r) return { processed: 0, failed: 0 }

  let processed = 0
  let failed = 0

  for (const queue of QUEUES) {
    for (let i = 0; i < BATCH_SIZE; i++) {
      let raw: string | null = null
      try {
        raw = await r.rpop<string>(queue)
      } catch {
        break
      }
      if (!raw) break

      let item: QueueItem
      try {
        item = JSON.parse(raw) as QueueItem
      } catch {
        failed++
        continue
      }

      item.status = "processing"
      await storeItem(r, item).catch(() => undefined)

      try {
        item.result = await handleItem(item)
        item.status = "completed"
        processed++
      } catch (err) {
        item.status = "failed"
        item.error = err instanceof Error ? err.message : String(err)
        failed++
      }

      await storeItem(r, item).catch(() => undefined)
    }
  }

  return { processed, failed }
}

export async function getQueueStatus(
  userId: string,
): Promise<{ position: number; estimatedWaitSeconds: number }> {
  const r = getRedis()
  if (!r) return { position: 0, estimatedWaitSeconds: 0 }

  let position = 0

  for (const queue of QUEUES) {
    let items: string[] = []
    try {
      items = (await r.lrange<string>(queue, 0, -1)) ?? []
    } catch {
      continue
    }

    // lrange returns newest-first (lpush order); reverse to count oldest first
    for (const raw of [...items].reverse()) {
      position++
      try {
        const item = JSON.parse(raw) as QueueItem
        if (item.userId === userId) {
          return { position, estimatedWaitSeconds: position * 3 }
        }
      } catch {
        // malformed entry - keep counting
      }
    }
  }

  return { position: 0, estimatedWaitSeconds: 0 }
}

export async function scheduleQueueProcessor(): Promise<void> {
  if (!getRedis()) return

  if (processorInterval) return

  processorInterval = setInterval(() => {
    processQueue().catch((err) => {
      console.error("[queue-processor] processQueue error:", err)
    })
  }, 5_000)
}

export { getRedis } from "@/lib/server/redis"
