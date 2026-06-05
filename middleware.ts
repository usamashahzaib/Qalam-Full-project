import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Helper to convert base64url string to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  if (pad) {
    base64 += "=".repeat(4 - pad)
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Helper to convert string to Uint8Array (UTF-8 encoding)
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Helper to check signatures in a timing-safe manner
function safeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false
  let result = 0
  for (let i = 0; i < a.byteLength; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const dot = token.lastIndexOf(".")
    if (dot < 0) return false

    const encoded = token.slice(0, dot)
    const signatureStr = token.slice(dot + 1)

    // Verify HMAC SHA-256 signature
    const secretKey = await crypto.subtle.importKey(
      "raw",
      stringToUint8Array(secret) as any,
      { name: "HMAC", hash: "SHA-256" } as any,
      false,
      ["sign", "verify"]
    )
    const computedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      stringToUint8Array(encoded) as any
    )
    const computedSignature = new Uint8Array(computedSignatureBuffer)
    const providedSignature = base64urlToUint8Array(signatureStr)

    if (!safeCompare(computedSignature, providedSignature)) {
      return false
    }

    // Parse encoded parts: [ivStr, authTagStr, encrypted]
    const parts = encoded.split(".")
    if (parts.length !== 3) return false
    const [ivStr, authTagStr, encryptedStr] = parts

    const iv = base64urlToUint8Array(ivStr)
    const authTag = base64urlToUint8Array(authTagStr)
    const encrypted = base64urlToUint8Array(encryptedStr)

    // Derive AES key by hashing the secret with SHA-256
    const keyHashBuffer = await crypto.subtle.digest("SHA-256", stringToUint8Array(secret) as any)
    const aesKey = await crypto.subtle.importKey(
      "raw",
      keyHashBuffer as any,
      { name: "AES-GCM" } as any,
      false,
      ["decrypt"]
    )

    // Combine encrypted data and authTag because Web Crypto decrypt expects:
    // ciphertext + tag (concatenated)
    const ciphertextWithTag = new Uint8Array(encrypted.length + authTag.length)
    ciphertextWithTag.set(encrypted, 0)
    ciphertextWithTag.set(authTag, encrypted.length)

    // Decrypt AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as any,
        tagLength: 128
      } as any,
      aesKey,
      ciphertextWithTag as any
    )

    const decryptedText = new TextDecoder().decode(decryptedBuffer)
    const payload = JSON.parse(decryptedText)

    // Basic verification of payload structure
    return Boolean(payload && payload.email)
  } catch (error) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protect ALL /api/* routes EXCEPT /api/auth/* and /api/webhooks/*
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks/")) {
      return NextResponse.next()
    }

    // Get the Authorization Bearer token or cookie values
    const authHeader = request.headers.get("Authorization")?.trim()
    const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

    // Check for qalam-session or qalam_app_session cookies
    const qalamSessionCookie = request.cookies.get("qalam-session")?.value
    const qalamAppSessionCookie = request.cookies.get("qalam_app_session")?.value

    const token = bearer || qalamSessionCookie || qalamAppSessionCookie

    if (!token) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    // Validate the token
    const secret = process.env.APP_SESSION_SECRET || "qalam-dev-secret-local-only"
    const isValid = await verifyToken(token, secret)

    if (!isValid) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/writer/:path*',
    '/agency/:path*',
    '/settings/:path*',
    '/api/generate/:path*',
    '/api/voice/:path*',
    '/api/carousel/:path*',
  ]
}

