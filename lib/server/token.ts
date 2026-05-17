import { createHmac, createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto"
import { env } from "@/lib/server/env"

const getEncryptionKey = () => createHash("sha256").update(env.appSessionSecret).digest()

export const createSignedToken = (payload: object): string => {
  const plaintext = JSON.stringify(payload)
  
  const iv = randomBytes(12)
  const key = getEncryptionKey()
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  
  let encrypted = cipher.update(plaintext, "utf8", "base64url")
  encrypted += cipher.final("base64url")
  
  const authTag = cipher.getAuthTag().toString("base64url")
  const ivStr = iv.toString("base64url")
  
  const encoded = `${ivStr}.${authTag}.${encrypted}`
  const signature = createHmac("sha256", env.appSessionSecret).update(encoded).digest("base64url")
  
  return `${encoded}.${signature}`
}

export const readSignedToken = <T>(token: string, invalidErrorCode: string): T => {
  const dot = token.lastIndexOf(".")
  if (dot < 0) throw new Error(invalidErrorCode)
  
  const encoded = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  
  const expectedSig = createHmac("sha256", env.appSessionSecret).update(encoded).digest("base64url")
  const left = Buffer.from(signature)
  const right = Buffer.from(expectedSig)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error(invalidErrorCode)
  }
  
  const parts = encoded.split(".")
  if (parts.length !== 3) throw new Error(invalidErrorCode)
  
  const [ivStr, authTagStr, encrypted] = parts
  try {
    const iv = Buffer.from(ivStr, "base64url")
    const authTag = Buffer.from(authTagStr, "base64url")
    const key = getEncryptionKey()
    
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, "base64url", "utf8")
    decrypted += decipher.final("utf8")
    
    return JSON.parse(decrypted) as T
  } catch {
    throw new Error(invalidErrorCode)
  }
}
