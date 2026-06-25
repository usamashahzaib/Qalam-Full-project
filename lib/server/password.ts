import { createHash, randomBytes, pbkdf2Sync } from "node:crypto"
import argon2 from "argon2"

// Argon2id is the recommended variant: resistant to both side-channel and
// GPU attacks. Memory=64MB, parallelism=1, iterations=3 per OWASP guidance.
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 1,
}

// Legacy PBKDF2 constants kept for verifying existing hashes during migration.
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEY_LEN = 64
const PBKDF2_DIGEST = "sha512"

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

// Returns true if valid. For legacy PBKDF2 hashes also returns the new
// argon2id hash so the caller can transparently upgrade it in the DB.
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ valid: boolean; rehash: string | null }> {
  // Argon2 hashes always start with $argon2
  if (stored.startsWith("$argon2")) {
    try {
      const valid = await argon2.verify(stored, password, ARGON2_OPTIONS)
      return { valid, rehash: null }
    } catch {
      return { valid: false, rehash: null }
    }
  }

  // Legacy PBKDF2: format is "salt:derivedHex"
  const [salt, storedHash] = stored.split(":")
  if (!salt || !storedHash) return { valid: false, rehash: null }

  const derived = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LEN, PBKDF2_DIGEST).toString("hex")
  const a = Buffer.from(derived, "hex")
  const b = Buffer.from(storedHash, "hex")
  if (a.length !== b.length) return { valid: false, rehash: null }

  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  const valid = diff === 0

  // On successful PBKDF2 verify, produce an argon2id hash for transparent migration.
  const rehash = valid ? await hashPassword(password) : null
  return { valid, rehash }
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
