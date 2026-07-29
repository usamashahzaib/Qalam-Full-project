import "server-only"

import { getRedis } from "@/lib/server/redis"

export type LinkedInPublishLock = {
  locked: boolean
  release: () => Promise<void>
}

export const acquireLinkedInPublishLock = async (postId: string): Promise<LinkedInPublishLock> => {
  const redis = getRedis()
  if (!redis) return { locked: true, release: async () => undefined }

  const key = `lock:linkedin:publish:${postId}`
  const token = crypto.randomUUID()
  const locked = await redis.set(key, token, { nx: true, ex: 300 })

  return {
    locked: locked === "OK",
    release: async () => {
      if (await redis.get<string>(key) === token) await redis.del(key)
    },
  }
}
