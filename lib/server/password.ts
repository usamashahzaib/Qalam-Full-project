import { createHash, randomBytes, pbkdf2Sync } from "node:crypto"

const ITERATIONS = 100_000
const KEY_LEN = 64
const DIGEST = "sha512"

export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex")
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex")
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":")
  if (!salt || !storedHash) return false
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex")
  const a = Buffer.from(derived, "hex")
  const b = Buffer.from(storedHash, "hex")
  if (a.length !== b.length) return false
  // Constant-time comparison to prevent timing attacks
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
