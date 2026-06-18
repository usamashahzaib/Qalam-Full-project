import { getRedis } from "./redis"

const FAILURE_THRESHOLD = 5
const FAILURE_WINDOW_SECONDS = 60
const OPEN_SECONDS = 300

type CircuitState = {
  failures: number
  state: "closed" | "open"
}

export async function checkCircuit(service: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true
  const state = await redis.get<CircuitState>(`circuit:${service}:state`)
  return state?.state !== "open"
}

export async function recordFailure(service: string) {
  const redis = getRedis()
  if (!redis) return

  const countKey = `circuit:${service}:failures`
  const stateKey = `circuit:${service}:state`
  const failures = await redis.incr(countKey)
  if (failures === 1) await redis.expire(countKey, FAILURE_WINDOW_SECONDS)
  if (failures >= FAILURE_THRESHOLD) {
    await redis.set(stateKey, { failures, state: "open" }, { ex: OPEN_SECONDS })
  }
}

export async function recordSuccess(service: string) {
  const redis = getRedis()
  if (!redis) return
  await redis.del(`circuit:${service}:failures`)
  await redis.del(`circuit:${service}:state`)
}
