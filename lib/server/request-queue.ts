import { Redis } from "@upstash/redis"

let redis: Redis | null = null

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || ""
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  if (!url.startsWith("https://") || url.includes("...") || !token || token.includes("...")) return null
  redis ??= new Redis({ url, token })
  return redis
}

interface QueueItem {
  id: string
  userId: string
  plan: string
  request: unknown
  timestamp: number
}

export async function addToQueue(item: QueueItem): Promise<{ position: number; estimatedWait: number }> {
  const activeRedis = getRedis()
  if (!activeRedis) return { position: 1, estimatedWait: 0 }

  const priority = item.plan === "Free" ? 3 : item.plan === "Solo" ? 2 : 1
  const queueKey = `queue:priority:${priority}`

  await activeRedis.lpush(queueKey, JSON.stringify(item))

  const queueLength = await activeRedis.llen(queueKey)
  const higherPriorityLength =
    priority === 3
      ? (await activeRedis.llen("queue:priority:1")) + (await activeRedis.llen("queue:priority:2"))
      : priority === 2
        ? await activeRedis.llen("queue:priority:1")
        : 0

  const position = higherPriorityLength + queueLength
  const estimatedWait = position * 3

  return { position, estimatedWait }
}
