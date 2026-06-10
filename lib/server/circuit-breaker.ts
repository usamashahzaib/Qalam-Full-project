import { getRedis } from "./redis"

const FAILURE_THRESHOLD = 5
const RESET_TIMEOUT = 60000

type CircuitState = {
  failures: number
  lastFailure: number
  state: string
}

export async function checkCircuit(service: string): Promise<boolean> {
  const activeRedis = getRedis()
  if (!activeRedis) return true

  const key = `circuit:${service}`
  const state = await activeRedis.get<CircuitState>(key)

  if (!state || state.state === "closed") return true
  if (state.state === "open") {
    if (Date.now() - state.lastFailure > RESET_TIMEOUT) {
      await activeRedis.set(key, { failures: 0, lastFailure: 0, state: "half-open" })
      return true
    }
    return false
  }
  return true
}

export async function recordFailure(service: string) {
  const activeRedis = getRedis()
  if (!activeRedis) return

  const key = `circuit:${service}`
  const state = (await activeRedis.get<CircuitState>(key)) || {
    failures: 0,
    lastFailure: 0,
    state: "closed",
  }

  const newFailures = state.failures + 1
  await activeRedis.set(key, {
    failures: newFailures,
    lastFailure: Date.now(),
    state: newFailures >= FAILURE_THRESHOLD ? "open" : "closed",
  })
}

export async function recordSuccess(service: string) {
  const activeRedis = getRedis()
  if (!activeRedis) return

  const key = `circuit:${service}`
  await activeRedis.set(key, { failures: 0, lastFailure: 0, state: "closed" })
}
